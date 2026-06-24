import unittest

from frontiercode_harness.manifest import manifest_from_dict
from frontiercode_harness.models import FrontierCodeResult
from frontiercode_harness.scoring import aggregate_results


class ScoringTests(unittest.TestCase):
    def test_failed_blocker_zeroes_score(self) -> None:
        manifest = manifest_from_dict(
            {
                "task_id": "demo",
                "criteria": [
                    {
                        "id": "behavior",
                        "category": "patch_specific",
                        "method": "command",
                        "blocker": True,
                        "weight": 0.5,
                        "command": "true",
                    },
                    {
                        "id": "quality",
                        "method": "llm_prompt",
                        "blocker": False,
                        "weight": 0.5,
                        "prompt": "judge",
                    },
                ],
            }
        )
        result = aggregate_results(
            manifest,
            [
                {"criterion_id": "behavior", "passed": False, "score": 0},
                {"criterion_id": "quality", "passed": True, "score": 1},
            ],
            "submission",
        )
        self.assertFalse(result.passed)
        # FrontierCode ground truth: failing a blocker zeroes the score (no hygiene floor).
        self.assertAlmostEqual(result.score, 0.0)
        self.assertEqual(result.blocker_failures, ("behavior",))
        self.assertEqual(result.criteria_results[0].category, "patch_specific")
        self.assertEqual(result.criteria_results[1].category, "regular")

    def test_passing_solution_uses_weighted_score(self) -> None:
        manifest = manifest_from_dict(
            {
                "task_id": "demo",
                "criteria": [
                    {"id": "behavior", "method": "command", "blocker": True, "weight": 0.75, "command": "true"},
                    {"id": "quality", "method": "llm_prompt", "blocker": False, "weight": 0.25, "prompt": "judge"},
                ],
            }
        )
        result = aggregate_results(
            manifest,
            [
                {"criterion_id": "behavior", "passed": True, "score": 1},
                {"criterion_id": "quality", "passed": True, "score": 0.5},
            ],
            "submission",
        )
        self.assertTrue(result.passed)
        self.assertAlmostEqual(result.score, 0.875)

    def test_result_json_preserves_and_defaults_categories(self) -> None:
        result = aggregate_results(
            manifest_from_dict(
                {
                    "task_id": "demo",
                    "criteria": [
                        {
                            "id": "behavior",
                            "category": "patch_specific",
                            "method": "command",
                            "blocker": True,
                            "command": "true",
                        }
                    ],
                }
            ),
            [{"criterion_id": "behavior", "passed": True, "score": 1}],
            "submission",
        )
        self.assertEqual(result.to_dict()["criteria_results"][0]["category"], "patch_specific")
        legacy = FrontierCodeResult.from_dict(
            {
                "task_id": "demo",
                "submission_id": "legacy",
                "pass": True,
                "score": 1,
                "reward": 1,
                "criteria_results": [
                    {
                        "criterion_id": "behavior",
                        "passed": True,
                        "score": 1,
                        "blocker": True,
                        "weight": 1,
                    }
                ],
            }
        )
        self.assertEqual(legacy.criteria_results[0].category, "regular")

    def test_result_json_recomputes_stale_blocker_gated_score(self) -> None:
        result = FrontierCodeResult.from_dict(
            {
                "task_id": "demo",
                "submission_id": "legacy",
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
                        "weight": 0.5,
                    },
                    {
                        "criterion_id": "quality",
                        "passed": True,
                        "score": 1,
                        "blocker": False,
                        "weight": 0.5,
                    },
                ],
            }
        )
        self.assertFalse(result.passed)
        # Blocker failure gates the recomputed score to 0 on read-back too.
        self.assertAlmostEqual(result.score, 0.0)
        self.assertEqual(result.reward, 0)



if __name__ == "__main__":
    unittest.main()
