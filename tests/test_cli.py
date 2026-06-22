import contextlib
import io
import json
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from frontiercode_harness.cli import build_parser, main, _frontiercode_progress_snapshot


class CliTests(unittest.TestCase):
    def test_eval_requires_reasoning_effort(self) -> None:
        parser = build_parser()
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as error:
                parser.parse_args(["eval", "--path", "task", "--agent", "codex"])
        self.assertEqual(error.exception.code, 2)

    def test_eval_prints_trial_metrics_and_results_path(self) -> None:
        completed = subprocess.CompletedProcess(
            args=[],
            returncode=0,
            stdout="harbor table output\n",
            stderr="",
        )
        results = [
            SimpleNamespace(passed=True, score=1.0),
            SimpleNamespace(passed=False, score=0.25),
        ]
        with TemporaryDirectory() as tmp:
            jobs_dir = Path(tmp) / "runs" / "eval-test"
            cell_dir = jobs_dir / "model-openai-gpt-5" / "reasoning-high"
            old_job = cell_dir / "old-job"
            old_job.mkdir(parents=True)
            (old_job / "result.json").write_text("{}", encoding="utf-8")

            def create_new_job(*args, **kwargs):
                new_job = cell_dir / "new-job"
                new_job.mkdir(parents=True)
                (new_job / "result.json").write_text(
                    json.dumps(
                        {
                            "task_name": "demo",
                            "trial_name": "demo__trial",
                            "config": {"task": {"path": "tasks/demo"}, "trial_name": "demo__trial"},
                            "verifier_result": {"rewards": {"reward": 1}},
                            "exception_info": None,
                        }
                    ),
                    encoding="utf-8",
                )
                return completed

            with (
                patch("frontiercode_harness.cli.run_harbor", side_effect=create_new_job) as run_harbor_mock,
                patch("frontiercode_harness.cli.load_frontiercode_results", return_value=results) as load_results,
                patch("frontiercode_harness.cli.write_results") as write_results,
            ):
                stdout = io.StringIO()
                with contextlib.redirect_stdout(stdout):
                    exit_code = main(
                        [
                            "eval",
                            "--path",
                            "task",
                            "--agent",
                            "codex",
                            "--model",
                            "openai/gpt-5",
                            "--reasoning-effort",
                            "high",
                            "--jobs-dir",
                            str(jobs_dir),
                            "--n-concurrent",
                            "3",
                        ]
                    )

        self.assertEqual(exit_code, 0)
        self.assertEqual(
            stdout.getvalue(),
            "Trial finished 1: demo/demo__trial model=openai/gpt-5 "
            "reasoning_effort=high PASS score=1.000\n"
            "Passing trials: 1/2\n"
            "Pass rate: 0.500\n"
            "Average score: 0.625\n"
            f"Results written to: {jobs_dir / 'frontiercode-report'}\n",
        )
        self.assertNotIn("harbor table output", stdout.getvalue())
        load_results.assert_called_once_with(cell_dir / "new-job")
        write_results.assert_called_once()
        call_args = write_results.call_args
        self.assertEqual(call_args.args[:2], (jobs_dir / "frontiercode-report", results))
        manifest = call_args.kwargs["run_manifest"]
        self.assertEqual(manifest["protocol"], "frontiercode-eval-v1")
        self.assertEqual(manifest["models"], ["openai/gpt-5"])
        self.assertEqual(manifest["reasoning_efforts"], ["high"])
        self.assertEqual(manifest["trials_per_cell"], 5)
        self.assertEqual(manifest["n_concurrent"], 3)
        self.assertEqual(manifest["status"], "completed")
        self.assertEqual(manifest["cells"][0]["jobs_dir"], str(cell_dir))
        self.assertEqual(manifest["cells"][0]["result_count"], 2)
        self.assertEqual(run_harbor_mock.call_args.kwargs["n_concurrent"], 3)

    def test_eval_progress_reports_nested_harbor_trials_not_job_aggregate(self) -> None:
        completed = subprocess.CompletedProcess(args=[], returncode=0, stdout="", stderr="")
        with TemporaryDirectory() as tmp:
            jobs_dir = Path(tmp) / "runs" / "eval-test"
            cell_dir = jobs_dir / "model-openai-gpt-5-5" / "reasoning-high"
            job_dir = cell_dir / "2026-06-17__11-20-53"

            def create_nested_job(*args, **kwargs):
                job_dir.mkdir(parents=True)
                (job_dir / "config.json").write_text("{}", encoding="utf-8")
                (job_dir / "result.json").write_text(
                    json.dumps(
                        {
                            "id": "job-id",
                            "n_total_trials": 2,
                            "stats": {"n_completed_trials": 2},
                            "finished_at": "2026-06-17T18:40:00Z",
                        }
                    ),
                    encoding="utf-8",
                )
                for trial_name, score in (
                    ("godhand__64b8f123b3cc__trialA", 1.0),
                    ("godhand__64b8f123b3cc__trialB", 0.0),
                ):
                    trial_dir = job_dir / trial_name
                    verifier_dir = trial_dir / "verifier"
                    verifier_dir.mkdir(parents=True)
                    (trial_dir / "config.json").write_text(
                        json.dumps(
                            {
                                "task": {"path": "generated_tasks/godhand__64b8f123b3cc"},
                                "trial_name": trial_name,
                            }
                        ),
                        encoding="utf-8",
                    )
                    (verifier_dir / "frontiercode_result.json").write_text(
                        json.dumps(
                            {
                                "task_id": "godhand__64b8f123b3cc",
                                "pass": score > 0,
                                "score": score,
                            }
                        ),
                        encoding="utf-8",
                    )
                return completed

            def load_results_for_trial(path: Path):
                score = 1.0 if path.name.endswith("trialA") else 0.0
                return [SimpleNamespace(passed=score > 0, score=score)]

            with (
                patch("frontiercode_harness.cli.run_harbor", side_effect=create_nested_job),
                patch(
                    "frontiercode_harness.cli.load_frontiercode_results",
                    side_effect=load_results_for_trial,
                ) as load_results,
                patch("frontiercode_harness.cli.write_results"),
            ):
                stdout = io.StringIO()
                with contextlib.redirect_stdout(stdout):
                    exit_code = main(
                        [
                            "eval",
                            "--path",
                            "task",
                            "--agent",
                            "codex",
                            "--model",
                            "openai/gpt-5.5",
                            "--reasoning-effort",
                            "high",
                            "--jobs-dir",
                            str(jobs_dir),
                        ]
                    )

        self.assertEqual(exit_code, 0)
        output = stdout.getvalue()
        self.assertIn(
            "Trial finished 1: godhand__64b8f123b3cc/"
            "godhand__64b8f123b3cc__trialA model=openai/gpt-5.5 "
            "reasoning_effort=high PASS score=1.000\n",
            output,
        )
        self.assertIn(
            "Trial finished 2: godhand__64b8f123b3cc/"
            "godhand__64b8f123b3cc__trialB model=openai/gpt-5.5 "
            "reasoning_effort=high FAIL score=0.000\n",
            output,
        )
        self.assertNotIn("Trial finished 1: godhand__64b8f123b3cc/2026-06-17__11-20-53", output)
        self.assertEqual(
            [call.args[0] for call in load_results.call_args_list],
            [
                job_dir / "godhand__64b8f123b3cc__trialA",
                job_dir / "godhand__64b8f123b3cc__trialB",
            ],
        )

    def test_frontiercode_progress_recomputes_stale_blocker_gated_score(self) -> None:
        snapshot = _frontiercode_progress_snapshot(
            {
                "task_id": "demo",
                "submission_id": "demo__trial",
                "pass": False,
                "score": 0,
                "criteria_results": [
                    {"criterion_id": "behavior", "passed": False, "score": 0, "weight": 0.5},
                    {"criterion_id": "quality", "passed": True, "score": 1, "weight": 0.5},
                ],
            },
            Path("demo__trial"),
        )

        self.assertIsNotNone(snapshot)
        assert snapshot is not None
        self.assertFalse(snapshot["passed"])
        self.assertAlmostEqual(snapshot["score"], 0.5)

    def test_eval_prints_trial_error_summary(self) -> None:
        completed = subprocess.CompletedProcess(args=[], returncode=0, stdout="", stderr="")
        results = [
            SimpleNamespace(
                passed=False,
                score=0.0,
                metadata={
                    "exception_type": "NonZeroAgentExitCodeError",
                    "exception_message": "agent auth failed\nsecond line",
                },
            )
        ]
        with TemporaryDirectory() as tmp:
            jobs_dir = Path(tmp) / "runs"
            cell_dir = jobs_dir / "model-openai-gpt-5" / "reasoning-high"

            def create_job(*args, **kwargs):
                new_job = cell_dir / "job"
                new_job.mkdir(parents=True)
                (new_job / "result.json").write_text(
                    json.dumps(
                        {
                            "task_name": "demo",
                            "trial_name": "demo__error",
                            "config": {"task": {"path": "tasks/demo"}, "trial_name": "demo__error"},
                            "verifier_result": None,
                            "exception_info": {
                                "exception_type": "NonZeroAgentExitCodeError",
                                "exception_message": "agent auth failed",
                            },
                        }
                    ),
                    encoding="utf-8",
                )
                return completed

            with (
                patch("frontiercode_harness.cli.run_harbor", side_effect=create_job),
                patch("frontiercode_harness.cli.load_frontiercode_results", return_value=results),
                patch("frontiercode_harness.cli.write_results"),
            ):
                stdout = io.StringIO()
                with contextlib.redirect_stdout(stdout):
                    exit_code = main(
                        [
                            "eval",
                            "--path",
                            "task",
                            "--agent",
                            "codex",
                            "--model",
                            "openai/gpt-5",
                            "--reasoning-effort",
                            "high",
                            "--jobs-dir",
                            str(jobs_dir),
                        ]
                    )

        self.assertEqual(exit_code, 0)
        self.assertIn(
            "Trial finished 1: demo/demo__error model=openai/gpt-5 "
            "reasoning_effort=high FAIL score=0.000 error=NonZeroAgentExitCodeError\n",
            stdout.getvalue(),
        )
        self.assertIn("Passing trials: 0/1\n", stdout.getvalue())
        self.assertIn("Pass rate: 0.000\n", stdout.getvalue())
        self.assertIn("Average score: 0.000\n", stdout.getvalue())
        self.assertIn("Errored trials: 1/1\n", stdout.getvalue())
        self.assertIn("- NonZeroAgentExitCodeError: 1 (agent auth failed)\n", stdout.getvalue())

    def test_eval_retries_failed_harbor_launch(self) -> None:
        failed = subprocess.CompletedProcess(args=[], returncode=124, stdout="", stderr="timeout\n")
        completed = subprocess.CompletedProcess(args=[], returncode=0, stdout="", stderr="")
        results = [SimpleNamespace(passed=True, score=1.0)]
        with TemporaryDirectory() as tmp:
            jobs_dir = Path(tmp) / "runs"
            cell_dir = jobs_dir / "model-openai-gpt-5" / "reasoning-high"

            calls = []

            def run_harbor_side_effect(*args, **kwargs):
                calls.append(kwargs)
                if len(calls) == 1:
                    return failed
                cell_dir.mkdir(parents=True, exist_ok=True)
                (cell_dir / "result.json").write_text("{}", encoding="utf-8")
                return completed

            with (
                patch("frontiercode_harness.cli.run_harbor", side_effect=run_harbor_side_effect) as run,
                patch("frontiercode_harness.cli.load_frontiercode_results", return_value=results),
                patch("frontiercode_harness.cli.write_results"),
            ):
                with contextlib.redirect_stdout(io.StringIO()):
                    with contextlib.redirect_stderr(io.StringIO()):
                        exit_code = main(
                            [
                                "eval",
                                "--path",
                                "task",
                                "--agent",
                                "codex",
                                "--model",
                                "openai/gpt-5",
                                "--reasoning-effort",
                                "high",
                                "--jobs-dir",
                                str(jobs_dir),
                                "--retries",
                                "1",
                            ]
                        )

        self.assertEqual(exit_code, 0)
        self.assertEqual(run.call_count, 2)


if __name__ == "__main__":
    unittest.main()
