from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from frontiercode_harness.manifest import load_manifest
from frontiercode_harness.qa import evaluate_patch_text, qa_task


def write_task(root: Path, calibration_text: str) -> None:
    (root / "environment" / "repo").mkdir(parents=True)
    (root / "tests" / "grader").mkdir(parents=True)
    (root / "task.toml").write_text('name = "demo"\n', encoding="utf-8")
    (root / "instruction.md").write_text("Do the thing.\n", encoding="utf-8")
    (root / "tests" / "test.sh").write_text("#!/usr/bin/env sh\nexit 0\n", encoding="utf-8")
    (root / "tests" / "grader" / "frontiercode.yaml").write_text(
        f"""
task_id: demo
repo_workdir: environment/repo
low_quality_threshold: 0.5
criteria:
  - id: behavior
    method: command
    blocker: true
    weight: 1
    command: "true"
{calibration_text}
""",
        encoding="utf-8",
    )


class TaskQATests(unittest.TestCase):
    def test_negative_calibration_that_passes_and_scores_high_fails_qa(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_task(
                root,
                """
calibrations:
  - id: bad-hack
    type: hack
    criteria_results:
      - criterion_id: behavior
        passed: true
        score: 1
  - id: alt
    type: alternative_valid
    criteria_results:
      - criterion_id: behavior
        passed: true
        score: 1
""",
            )
            report = qa_task(root)
        self.assertFalse(report.passed)
        self.assertTrue(any("negative calibration passed" in error for error in report.errors))

    def test_alternative_valid_must_pass_blockers(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_task(
                root,
                """
calibrations:
  - id: hack
    type: hack
    criteria_results:
      - criterion_id: behavior
        passed: false
        score: 0
  - id: alt
    type: alternative_valid
    criteria_results:
      - criterion_id: behavior
        passed: false
        score: 0
""",
            )
            report = qa_task(root)
        self.assertFalse(report.passed)
        self.assertTrue(any("alternative_valid calibration failed" in error for error in report.errors))

    def test_no_solution_folder_allowed(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_task(
                root,
                """
calibrations:
  - id: hack
    type: hack
    criteria_results:
      - criterion_id: behavior
        passed: false
        score: 0
  - id: alt
    type: alternative_valid
    criteria_results:
      - criterion_id: behavior
        passed: true
        score: 1
""",
            )
            (root / "solution").mkdir()
            report = qa_task(root)
        self.assertFalse(report.passed)
        self.assertTrue(any("solution/" in error for error in report.errors))

    def test_evaluate_patch_text_reports_apply_failure_with_submission_id(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_task(
                root,
                """
calibrations:
  - id: hack
    type: hack
    criteria_results:
      - criterion_id: behavior
        passed: false
        score: 0
  - id: alt
    type: alternative_valid
    criteria_results:
      - criterion_id: behavior
        passed: true
        score: 1
""",
            )
            manifest = load_manifest(root)

            result = evaluate_patch_text(
                root,
                manifest,
                "this is not a diff\n",
                submission_id="generated-bad-patch",
            )

        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result.submission_id, "generated-bad-patch")
        self.assertFalse(result.passed)

    def test_evaluate_patch_text_converts_apply_timeout_to_failed_result(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_task(
                root,
                """
calibrations:
  - id: hack
    type: hack
    criteria_results:
      - criterion_id: behavior
        passed: false
        score: 0
  - id: alt
    type: alternative_valid
    criteria_results:
      - criterion_id: behavior
        passed: true
        score: 1
""",
            )
            manifest = load_manifest(root)

            def fake_run(command, **kwargs):  # noqa: ANN001 - subprocess test double.
                if command[0] == "git":
                    return subprocess.CompletedProcess(command, 1, stdout="", stderr="git apply failed")
                raise subprocess.TimeoutExpired(command, kwargs["timeout"])

            with patch("frontiercode_harness.qa.subprocess.run", fake_run):
                result = evaluate_patch_text(
                    root,
                    manifest,
                    "diff --git a/missing b/missing\n",
                    submission_id="generated-timeout-patch",
                )

        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result.submission_id, "generated-timeout-patch")
        self.assertFalse(result.passed)
        details = "\n".join(item.details for item in result.criteria_results)
        self.assertIn("timed out", details)


if __name__ == "__main__":
    unittest.main()
