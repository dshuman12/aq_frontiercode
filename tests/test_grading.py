import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from frontiercode_harness.grading import (
    find_submission_patch,
    grade_results_with_llm,
)
from frontiercode_harness.models import FrontierCodeResult
from frontiercode_harness.scoring import aggregate_results
from frontiercode_harness.manifest import manifest_from_dict


def _manifest():
    return manifest_from_dict(
        {
            "task_id": "demo",
            "criteria": [
                {"id": "behavior", "method": "command", "blocker": True, "weight": 0.75, "command": "true"},
                {"id": "quality", "method": "llm_prompt", "blocker": False, "weight": 0.25, "prompt": "judge"},
            ],
        }
    )


class EvaluatedExclusionTests(unittest.TestCase):
    def test_not_evaluated_item_excluded_from_score(self) -> None:
        # quality is not evaluated -> score is the behavior-only weighted average (1.0),
        # NOT diluted/inflated by a free pass.
        result = aggregate_results(
            _manifest(),
            [
                {"criterion_id": "behavior", "passed": True, "score": 1},
                {"criterion_id": "quality", "passed": True, "score": 1, "evaluated": False},
            ],
            "submission",
        )
        self.assertTrue(result.passed)
        self.assertAlmostEqual(result.score, 1.0)
        self.assertFalse(result.criteria_results[1].evaluated)

    def test_not_evaluated_blocker_fails_closed(self) -> None:
        manifest = manifest_from_dict(
            {
                "task_id": "demo",
                "criteria": [
                    {"id": "behavior", "method": "command", "blocker": True, "weight": 1.0, "command": "true"},
                ],
            }
        )
        result = aggregate_results(
            manifest,
            [{"criterion_id": "behavior", "passed": True, "score": 1, "evaluated": False}],
            "submission",
        )
        self.assertFalse(result.passed)
        self.assertEqual(result.blocker_failures, ("behavior",))
        self.assertAlmostEqual(result.score, 0.0)

    def test_evaluated_flag_round_trips_through_json(self) -> None:
        result = aggregate_results(
            _manifest(),
            [
                {"criterion_id": "behavior", "passed": True, "score": 1},
                {"criterion_id": "quality", "passed": True, "score": 1, "evaluated": False},
            ],
            "submission",
        )
        reloaded = FrontierCodeResult.from_dict(result.to_dict())
        self.assertFalse(reloaded.criteria_results[1].evaluated)
        self.assertAlmostEqual(reloaded.score, 1.0)


class GradeResultsWithLlmTests(unittest.TestCase):
    def _build_task(self, root: Path) -> Path:
        task = root / "demo"
        (task / "tests" / "grader").mkdir(parents=True)
        (task / "tests" / "grader" / "frontiercode.json").write_text(
            json.dumps(
                {
                    "task_id": "demo",
                    "criteria": [
                        {"id": "behavior", "method": "command", "blocker": True, "weight": 0.5, "command": "true"},
                        {"id": "quality", "method": "llm_prompt", "blocker": False, "weight": 0.5, "prompt": "judge"},
                    ],
                }
            ),
            encoding="utf-8",
        )
        (task / "task.toml").write_text("", encoding="utf-8")
        return task

    def test_grades_quality_from_patch(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            self._build_task(root)
            trial = root / "runs" / "trial-1" / "verifier"
            trial.mkdir(parents=True)
            (trial / "submission.patch").write_text("diff --git a/x b/x\n", encoding="utf-8")
            result = FrontierCodeResult.from_dict(
                {
                    "task_id": "demo",
                    "submission_id": "trial-1",
                    "pass": True,
                    "score": 1.0,
                    "reward": 1.0,
                    "criteria_results": [
                        {"criterion_id": "behavior", "passed": True, "score": 1, "blocker": True, "weight": 0.5},
                        {"criterion_id": "quality", "passed": True, "score": 0, "blocker": False, "weight": 0.5, "evaluated": False},
                    ],
                    "metadata": {"source": str(trial / "frontiercode_result.json")},
                }
            )

            def fake_judge(criterion, diff_text, cache_dir, *, task_id, submission_id, model=None):
                from frontiercode_harness.models import CriterionResult

                return CriterionResult(
                    criterion_id=criterion.id, passed=True, score=0.4,
                    blocker=criterion.blocker, weight=criterion.weight,
                    method="llm_prompt", evaluated=True,
                )

            import frontiercode_harness.grading as grading_mod

            original = grading_mod.judge_diff
            grading_mod.judge_diff = fake_judge
            try:
                graded, stats = grade_results_with_llm([result], task_root=root)
            finally:
                grading_mod.judge_diff = original

            self.assertEqual(stats["graded"], 1)
            self.assertTrue(graded[0].criteria_results[1].evaluated)
            # behavior(1.0, w0.5) + quality(0.4, w0.5) = 0.7
            self.assertAlmostEqual(graded[0].score, 0.7)

    def test_find_submission_patch(self) -> None:
        with TemporaryDirectory() as tmp:
            verifier = Path(tmp) / "verifier"
            verifier.mkdir(parents=True)
            (verifier / "submission.patch").write_text("x", encoding="utf-8")
            result = FrontierCodeResult.from_dict(
                {
                    "task_id": "demo",
                    "submission_id": "t",
                    "pass": True,
                    "score": 1,
                    "reward": 1,
                    "criteria_results": [],
                    "metadata": {"source": str(verifier / "frontiercode_result.json")},
                }
            )
            self.assertEqual(find_submission_patch(result), verifier / "submission.patch")


if __name__ == "__main__":
    unittest.main()
