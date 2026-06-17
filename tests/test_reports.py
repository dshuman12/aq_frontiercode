import unittest

from frontiercode_harness.models import CriterionResult, FrontierCodeResult
from frontiercode_harness.reports import (
    render_results_markdown,
    summarize_final_results,
    summarize_results,
)


class ReportTests(unittest.TestCase):
    def test_summarizes_trials_by_model_and_effort(self) -> None:
        results = [
            FrontierCodeResult(
                task_id="demo",
                submission_id=f"trial-{index}",
                passed=index in {0, 3},
                score=1.0 if index in {0, 3} else 0.0,
                reward=1.0 if index in {0, 3} else 0.0,
                blocker_failures=() if index in {0, 3} else ("harbor_reward",),
                criteria_results=(
                    CriterionResult(
                        "patch-a",
                        passed=index in {0, 3},
                        score=1.0 if index in {0, 3} else 0.0,
                        blocker=True,
                        weight=1.0,
                        details=(
                            "hidden suite failed:\n"
                            "[ RUN  ] rejects_oversized_payload\n"
                            "[ FAIL ] rejects_oversized_payload\n"
                            "=== Results: 2 passed, 1 failed, 3 assertions ==="
                            if index == 1
                            else ""
                        ),
                        category="patch_specific",
                    ),
                    CriterionResult(
                        "patch-b",
                        passed=True,
                        score=1.0,
                        blocker=True,
                        weight=1.0,
                        category="patch_specific",
                    ),
                    CriterionResult(
                        "regular-a",
                        passed=True,
                        score=1.0,
                        blocker=True,
                        weight=1.0,
                        category="regular",
                    ),
                ),
                metadata={
                    "agent": "codex",
                    "model": "openai/gpt-5",
                    "reasoning_effort": "high",
                    **(
                        {
                            "exception_type": "NonZeroAgentExitCodeError",
                            "exception_message": "agent auth failed\nmissing API key",
                            "exception_traceback": "Traceback...",
                            "exception_occurred_at": "2026-06-16T12:26:23",
                        }
                        if index == 1
                        else {}
                    ),
                },
            )
            for index in range(5)
        ]

        summary = summarize_results(results)
        self.assertEqual(len(summary), 1)
        self.assertEqual(summary[0]["n_trials"], 5)
        self.assertAlmostEqual(summary[0]["pass_rate"], 0.4)
        self.assertAlmostEqual(summary[0]["average_score"], 0.4)

        markdown = render_results_markdown(results)
        self.assertIn("one independent agent solve trajectory", markdown)
        self.assertIn("| demo | codex | openai/gpt-5 | high | 5 | 0.400 | 0.400 | 0.400 |", markdown)
        self.assertIn("Criteria | Categories", markdown)
        self.assertIn("2/3 | patch_specific 1/2, regular 1/1", markdown)
        self.assertIn("## Grader Details", markdown)
        self.assertIn("Trial score is zero when any blocker criterion fails", markdown)
        self.assertIn("| patch-a | patch_specific | unknown | yes | 1.000 | 0.000 | no |", markdown)
        self.assertIn("Run error:", markdown)
        self.assertIn("NonZeroAgentExitCodeError", markdown)
        self.assertIn("agent auth failed", markdown)
        self.assertIn("Traceback...", markdown)
        self.assertIn("[ FAIL ] rejects_oversized_payload", markdown)
        self.assertIn("=== Results: 2 passed, 1 failed, 3 assertions ===", markdown)

    def test_final_summary_uses_best_effort_by_average_score(self) -> None:
        results = [
            FrontierCodeResult(
                task_id="demo",
                submission_id="low-1",
                passed=True,
                score=0.4,
                reward=1.0,
                blocker_failures=(),
                criteria_results=(),
                metadata={
                    "agent": "codex",
                    "model": "openai/gpt-5",
                    "reasoning_effort": "low",
                },
            ),
            FrontierCodeResult(
                task_id="demo",
                submission_id="low-2",
                passed=True,
                score=0.4,
                reward=1.0,
                blocker_failures=(),
                criteria_results=(),
                metadata={
                    "agent": "codex",
                    "model": "openai/gpt-5",
                    "reasoning_effort": "low",
                },
            ),
            FrontierCodeResult(
                task_id="demo",
                submission_id="high-1",
                passed=True,
                score=1.0,
                reward=1.0,
                blocker_failures=(),
                criteria_results=(),
                metadata={
                    "agent": "codex",
                    "model": "openai/gpt-5",
                    "reasoning_effort": "high",
                },
            ),
            FrontierCodeResult(
                task_id="demo",
                submission_id="high-2",
                passed=False,
                score=0.0,
                reward=0.0,
                blocker_failures=("behavior",),
                criteria_results=(),
                metadata={
                    "agent": "codex",
                    "model": "openai/gpt-5",
                    "reasoning_effort": "high",
                },
            ),
        ]

        summary = summarize_final_results(results)

        self.assertEqual(len(summary), 1)
        self.assertEqual(summary[0]["best_reasoning_effort"], "high")
        self.assertAlmostEqual(summary[0]["final_score"], 0.5)
        self.assertAlmostEqual(summary[0]["final_pass_rate"], 0.5)


if __name__ == "__main__":
    unittest.main()
