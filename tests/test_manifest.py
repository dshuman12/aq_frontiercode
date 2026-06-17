from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from frontiercode_harness.manifest import ManifestError, load_manifest


class ManifestTests(unittest.TestCase):
    def test_loads_yaml_subset_manifest(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            grader = root / "tests" / "grader"
            grader.mkdir(parents=True)
            (grader / "frontiercode.yaml").write_text(
                """
task_id: demo
repo_workdir: environment/repo
criteria:
  - id: behavior
    category: patch_specific
    method: command
    blocker: true
    weight: 1
    command: python3 -m pytest
calibrations:
  - id: bad
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
                encoding="utf-8",
            )
            manifest = load_manifest(root)
        self.assertEqual(manifest.task_id, "demo")
        self.assertEqual(manifest.criteria[0].id, "behavior")
        self.assertEqual(manifest.criteria[0].category, "patch_specific")
        self.assertEqual(len(manifest.calibrations), 2)

    def test_defaults_criterion_category_to_regular(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            grader = root / "tests" / "grader"
            grader.mkdir(parents=True)
            (grader / "frontiercode.yaml").write_text(
                """
task_id: demo
criteria:
  - id: behavior
    method: command
    blocker: true
    command: "true"
""",
                encoding="utf-8",
            )
            manifest = load_manifest(root)
        self.assertEqual(manifest.criteria[0].category, "regular")

    def test_rejects_unknown_criterion_category(self) -> None:
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            grader = root / "tests" / "grader"
            grader.mkdir(parents=True)
            (grader / "frontiercode.yaml").write_text(
                """
task_id: demo
criteria:
  - id: behavior
    category: smoke
    method: command
    blocker: true
    command: "true"
""",
                encoding="utf-8",
            )
            with self.assertRaises(ManifestError):
                load_manifest(root)


if __name__ == "__main__":
    unittest.main()
