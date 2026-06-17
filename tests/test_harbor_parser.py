import json
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from frontiercode_harness.harbor import load_frontiercode_results, run_harbor


class HarborParserTests(unittest.TestCase):
    def test_run_harbor_passes_reasoning_effort(self) -> None:
        completed = subprocess.CompletedProcess(args=[], returncode=0, stdout="", stderr="")
        with patch("frontiercode_harness.harbor.subprocess.run", return_value=completed) as run:
            run_harbor(
                task_path=Path("task"),
                agent="codex",
                models=["openai/gpt-5"],
                trials=5,
                reasoning_effort="medium",
                jobs_dir=Path("runs/reasoning-medium"),
                harbor_bin="harbor",
                artifact_paths=["/logs/verifier/submission.patch"],
                n_concurrent=3,
            )
        command = run.call_args.args[0]
        self.assertIn("--n-attempts", command)
        self.assertEqual(command[command.index("--n-attempts") + 1], "5")
        self.assertIn("--n-concurrent", command)
        self.assertEqual(command[command.index("--n-concurrent") + 1], "3")
        self.assertIn("--agent-kwarg", command)
        self.assertEqual(
            command[command.index("--agent-kwarg") + 1],
            "reasoning_effort=medium",
        )
        self.assertIn("--artifact", command)
        self.assertEqual(
            command[command.index("--artifact") + 1],
            "/logs/verifier/submission.patch",
        )
        self.assertEqual(run.call_args.kwargs["timeout"], None)

    def test_run_harbor_maps_eval_env_vars_for_harbor_adapter(self) -> None:
        completed = subprocess.CompletedProcess(args=[], returncode=0, stdout="", stderr="")
        with (
            patch.dict(
                os.environ,
                {
                    "EVAL_API_KEY": "eval-key",
                    "EVAL_BASE_URL": "https://eval.example/v1",
                    "OPENAI_API_KEY": "legacy-key",
                    "OPENAI_BASE_URL": "https://legacy.example/v1",
                },
                clear=True,
            ),
            patch("frontiercode_harness.harbor.subprocess.run", return_value=completed) as run,
        ):
            run_harbor(
                task_path=Path("task"),
                agent="codex",
                models=["openai/gpt-5"],
                trials=1,
                reasoning_effort="high",
                jobs_dir=Path("runs"),
            )

        env = run.call_args.kwargs["env"]
        self.assertEqual(env["OPENAI_API_KEY"], "eval-key")
        self.assertEqual(env["OPENAI_BASE_URL"], "https://eval.example/v1")

    def test_run_harbor_does_not_forward_legacy_openai_env_without_eval_env(self) -> None:
        completed = subprocess.CompletedProcess(args=[], returncode=0, stdout="", stderr="")
        with (
            patch.dict(
                os.environ,
                {
                    "OPENAI_API_KEY": "legacy-key",
                    "OPENAI_BASE_URL": "https://legacy.example/v1",
                },
                clear=True,
            ),
            patch("frontiercode_harness.harbor.subprocess.run", return_value=completed) as run,
        ):
            run_harbor(
                task_path=Path("task"),
                agent="codex",
                models=["openai/gpt-5"],
                trials=1,
                reasoning_effort="high",
                jobs_dir=Path("runs"),
            )

        env = run.call_args.kwargs["env"]
        self.assertNotIn("OPENAI_API_KEY", env)
        self.assertNotIn("OPENAI_BASE_URL", env)

    def test_run_harbor_converts_timeout_to_failed_process(self) -> None:
        with patch(
            "frontiercode_harness.harbor.subprocess.run",
            side_effect=subprocess.TimeoutExpired(cmd=["harbor"], timeout=3, stderr="slow"),
        ):
            result = run_harbor(
                task_path=Path("task"),
                agent="codex",
                models=["openai/gpt-5"],
                trials=1,
                reasoning_effort="high",
                jobs_dir=Path("runs"),
                timeout_seconds=3,
            )

        self.assertEqual(result.returncode, 124)
        self.assertIn("slow", result.stderr)
        self.assertIn("timed out after 3 seconds", result.stderr)

    def test_loads_frontiercode_result_files(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            trial = root / "job" / "task" / "trial-1"
            trial.mkdir(parents=True)
            (trial / "frontiercode_result.json").write_text(
                json.dumps(
                    {
                        "task_id": "demo",
                        "submission_id": "trial-1",
                        "pass": True,
                        "score": 0.75,
                        "reward": 1,
                        "blocker_failures": [],
                        "criteria_results": [
                            {
                                "criterion_id": "behavior",
                                "passed": True,
                                "score": 1,
                                "blocker": True,
                                "weight": 1,
                                "method": "command",
                                "category": "patch_specific",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            results = load_frontiercode_results(root)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].task_id, "demo")
        self.assertTrue(results[0].passed)
        self.assertEqual(results[0].criteria_results[0].category, "patch_specific")

    def test_frontiercode_result_files_include_sibling_trial_errors(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            trial = root / "job" / "task" / "trial-1"
            verifier = trial / "verifier"
            verifier.mkdir(parents=True)
            (trial / "result.json").write_text(
                json.dumps(
                    {
                        "trial_name": "trial-1",
                        "config": {"task": {"path": "tasks/demo"}},
                        "exception_info": {
                            "exception_type": "NonZeroAgentExitCodeError",
                            "exception_message": "agent auth failed",
                            "exception_traceback": "Traceback...",
                            "occurred_at": "2026-06-16T12:26:23",
                        },
                    }
                ),
                encoding="utf-8",
            )
            (verifier / "frontiercode_result.json").write_text(
                json.dumps(
                    {
                        "task_id": "demo",
                        "submission_id": "trial-1",
                        "pass": False,
                        "score": 0,
                        "reward": 0,
                        "blocker_failures": ["behavior"],
                        "criteria_results": [
                            {
                                "criterion_id": "behavior",
                                "passed": False,
                                "score": 0,
                                "blocker": True,
                                "weight": 1,
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            results = load_frontiercode_results(root)

        self.assertEqual(len(results), 1)
        metadata = results[0].metadata
        self.assertEqual(metadata["exception_type"], "NonZeroAgentExitCodeError")
        self.assertEqual(metadata["exception_message"], "agent auth failed")
        self.assertEqual(metadata["exception_traceback"], "Traceback...")
        self.assertEqual(metadata["exception_occurred_at"], "2026-06-16T12:26:23")

    def test_reward_parser_extracts_trial_metadata(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            trial = root / "job" / "demo__abc123"
            verifier = trial / "verifier"
            verifier.mkdir(parents=True)
            (trial / "config.json").write_text(
                json.dumps(
                    {
                        "task": {"name": None, "path": "tasks/demo"},
                        "trial_name": "demo__abc123",
                        "job_id": "job-1",
                        "agent": {
                            "name": "codex",
                            "model_name": "openai/gpt-5",
                            "kwargs": {"reasoning_effort": "high"},
                        },
                    }
                ),
                encoding="utf-8",
            )
            (verifier / "reward.json").write_text(
                json.dumps({"reward": 1, "message": "passed"}),
                encoding="utf-8",
            )
            results = load_frontiercode_results(root)
        self.assertEqual(len(results), 1)
        result = results[0]
        self.assertEqual(result.task_id, "demo")
        self.assertEqual(result.submission_id, "demo__abc123")
        self.assertEqual(result.metadata["agent"], "codex")
        self.assertEqual(result.metadata["model"], "openai/gpt-5")
        self.assertEqual(result.metadata["reasoning_effort"], "high")
        self.assertEqual(result.metadata["job_id"], "job-1")

    def test_harbor_trial_results_include_errors_as_failed_trials(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            passed = root / "job" / "demo__pass"
            errored = root / "job" / "demo__error"
            passed.mkdir(parents=True)
            errored.mkdir(parents=True)
            config = {
                "task": {"path": "tasks/demo"},
                "agent": {
                    "name": "codex",
                    "model_name": "openai/gpt-5",
                },
                "job_id": "job-1",
            }
            high_config = {
                **config,
                "agent": {
                    **config["agent"],
                    "kwargs": {"reasoning_effort": "high"},
                },
            }
            (passed / "result.json").write_text(
                json.dumps(
                    {
                        "task_name": "demo",
                        "trial_name": "demo__pass",
                        "config": {**high_config, "trial_name": "demo__pass"},
                        "verifier_result": {"rewards": {"reward": 1}},
                        "exception_info": None,
                    }
                ),
                encoding="utf-8",
            )
            (errored / "result.json").write_text(
                json.dumps(
                    {
                        "task_name": "demo",
                        "trial_name": "demo__error",
                        "config": {**config, "trial_name": "demo__error"},
                        "verifier_result": None,
                        "exception_info": {
                            "exception_type": "NonZeroAgentExitCodeError",
                            "exception_message": "agent setup failed",
                        },
                    }
                ),
                encoding="utf-8",
            )

            results = load_frontiercode_results(root)

        self.assertEqual(len(results), 2)
        by_submission = {result.submission_id: result for result in results}
        self.assertTrue(by_submission["demo__pass"].passed)
        self.assertFalse(by_submission["demo__error"].passed)
        self.assertEqual(by_submission["demo__error"].score, 0.0)
        self.assertEqual(
            by_submission["demo__error"].blocker_failures,
            ("NonZeroAgentExitCodeError",),
        )
        self.assertEqual(by_submission["demo__error"].metadata["reasoning_effort"], "high")
        self.assertTrue(by_submission["demo__error"].metadata["reasoning_effort_inferred"])


if __name__ == "__main__":
    unittest.main()
