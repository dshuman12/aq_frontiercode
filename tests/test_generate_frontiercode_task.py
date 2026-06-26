from pathlib import Path
from tempfile import TemporaryDirectory
import importlib.util
import sys
import types
import unittest

from frontiercode_harness.manifest import load_manifest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = ROOT / "scripts" / "generate_frontiercode_task.py"
SPEC = importlib.util.spec_from_file_location("generate_frontiercode_task", SCRIPT_PATH)
assert SPEC is not None
generate_frontiercode_task = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = generate_frontiercode_task
SPEC.loader.exec_module(generate_frontiercode_task)


class GenerateFrontierCodeTaskTests(unittest.TestCase):
    def test_parser_does_not_expose_google_sheet_status_updates(self) -> None:
        help_text = generate_frontiercode_task.build_parser().format_help()

        self.assertIn("--qa-status-csv", help_text)
        self.assertNotIn("--qa-status-sheet-url", help_text)
        self.assertNotIn("GOOGLE_SHEETS_ACCESS_TOKEN", help_text)

    def test_instruction_footer_marks_task_as_pull_request(self) -> None:
        instruction = """# Task description

Fix the parser behavior while preserving existing output contracts.

# Test guidelines

Run the visible tests for the parser.

# Lint guidelines

Run the repository formatter if available.

# Style guidelines

Keep the patch focused on the parser behavior.
"""

        updated = generate_frontiercode_task.append_pr_scope_instruction(instruction)

        self.assertIn(generate_frontiercode_task.PR_SCOPE_INSTRUCTION, updated)
        self.assertEqual(updated.count(generate_frontiercode_task.PR_SCOPE_INSTRUCTION), 1)
        self.assertIn("pull request", updated)
        self.assertIn("original repository", updated)
        self.assertIn("generated or build artifacts", updated)
        self.assertEqual(
            generate_frontiercode_task.append_pr_scope_instruction(updated).count(
                generate_frontiercode_task.PR_SCOPE_INSTRUCTION
            ),
            1,
        )

    def test_run_criteria_template_includes_advisory_rubric_items(self) -> None:
        module = types.ModuleType("generated_run_criteria_for_test")
        sys.modules[module.__name__] = module
        try:
            exec(generate_frontiercode_task.RUN_CRITERIA_TEMPLATE, module.__dict__)
            criteria = module.criteria(
                {
                    "advisory_rubric_items": [
                        {
                            "id": "semantic_behavior_check",
                            "category": "regular",
                            "weight": 0.02,
                        }
                    ]
                }
            )
            result = module.evaluate_criterion(criteria[-1], Path("."), Path("."), {})
        finally:
            sys.modules.pop(module.__name__, None)

        base_criteria = module.criteria({})
        self.assertEqual(len(criteria), len(base_criteria) + 1)
        self.assertEqual(criteria[-1].id, "semantic_behavior_check")
        self.assertEqual(result["method"], "llm_prompt")
        self.assertTrue(result["passed"])

    def test_render_manifest_does_not_enforce_fixed_rubric_item_count(self) -> None:
        row = {
            "Repository": "example/project",
            "Task ID": "row-1",
            "Bug / Task Description": "Fix parser handling for empty records without changing public output formats.",
            "Source Archive": "/tmp/source.tar.gz",
            "Commit Subject": "Handle empty parser records",
        }
        original_templates = generate_frontiercode_task.ADVISORY_RUBRIC_ITEM_TEMPLATES
        generate_frontiercode_task.ADVISORY_RUBRIC_ITEM_TEMPLATES = tuple(
            {
                "id": f"extra_quality_check_{index}",
                "category": "regular",
                "weight": 0.01,
                "description": "Extra advisory check for {repository}.",
                "prompt": "Score an extra advisory dimension for {task_description}.",
            }
            for index in range(45)
        )
        try:
            manifest_text = generate_frontiercode_task.render_manifest(
                row=row,
                task_id="example__row_1",
                base_commit="abc123",
                fix_commit="def456",
                visible_command="python3 -m pytest",
                reference_test_files=["tests/test_parser.py"],
                changed_paths=["src/parser.py", "tests/test_parser.py"],
                allowed_prefixes=["tests/"],
                max_changed_files=6,
                max_changed_lines=250,
            )
        finally:
            generate_frontiercode_task.ADVISORY_RUBRIC_ITEM_TEMPLATES = original_templates

        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            grader = root / "tests" / "grader"
            grader.mkdir(parents=True)
            (grader / "frontiercode.yaml").write_text(manifest_text, encoding="utf-8")
            manifest = load_manifest(root)

        self.assertGreater(len(manifest.criteria), 40)
        self.assertEqual(
            sum(1 for criterion in manifest.criteria if criterion.method == "llm_prompt"),
            45,
        )
        criterion_ids = manifest.criterion_ids
        for calibration in manifest.calibrations:
            self.assertEqual(
                {item["criterion_id"] for item in calibration.criteria_results},
                criterion_ids,
            )


if __name__ == "__main__":
    unittest.main()
