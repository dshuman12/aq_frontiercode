import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from frontiercode_harness.mutagent import (
    Contract,
    FailureKind,
    Mutagent,
    Outcome,
    RunResult,
    classify_failure,
)


class ClassifyFailureTests(unittest.TestCase):
    def test_compile_error_is_cosmetic(self) -> None:
        result = RunResult(passed=False, returncode=1, failure_category="compile")
        self.assertIs(classify_failure(result, Contract()), FailureKind.COSMETIC)

    def test_string_literal_assert_is_cosmetic(self) -> None:
        result = RunResult(
            passed=False, returncode=1, failure_category="assert",
            assert_expected_kind="string_literal", stdout="expected 'foo'",
        )
        self.assertIs(classify_failure(result, Contract()), FailureKind.COSMETIC)

    def test_denylisted_string_is_behavioral(self) -> None:
        result = RunResult(
            passed=False, returncode=1, failure_category="assert",
            assert_expected_kind="string_literal", stdout="expected 'warning:'",
        )
        contract = Contract(denied_string_literals=("warning:",))
        self.assertIs(classify_failure(result, contract), FailureKind.BEHAVIORAL)

    def test_value_assert_is_behavioral(self) -> None:
        result = RunResult(
            passed=False, returncode=1, failure_category="assert",
            assert_expected_kind="value",
        )
        self.assertIs(classify_failure(result, Contract()), FailureKind.BEHAVIORAL)

    def test_unknown_fails_closed(self) -> None:
        result = RunResult(passed=False, returncode=1, failure_category=None)
        self.assertIs(classify_failure(result, Contract()), FailureKind.UNKNOWN)


def _mkdir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


class _Adapter:
    """Never proposes anything; used for paths that should not reach adaptation."""

    def propose_diff(self, **_kwargs) -> str:  # noqa: ANN003
        raise AssertionError("adapter should not be called")


class MutagentPipelineTests(unittest.TestCase):
    def _write_ref(self, tmp: Path) -> Path:
        ref = tmp / "T_ref.txt"
        ref.write_text("assert value == 1\n", encoding="utf-8")
        return ref

    def test_baseline_pass_no_adaptation(self) -> None:
        class Runner:
            def run(self, test_file: Path, repo: Path) -> RunResult:
                return RunResult(passed=True, returncode=0)

        with TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            result = Mutagent(Runner(), _Adapter()).grade(
                t_ref=self._write_ref(tmp_path),
                repo_patched=tmp_path,
                repo_base=tmp_path,
                contract=Contract(),
                workdir=_mkdir(tmp_path / "wd"),
            )
        self.assertTrue(result.passed)
        self.assertIs(result.outcome, Outcome.PASS_NO_ADAPT)

    def test_behavioral_failure_not_adapted(self) -> None:
        class Runner:
            def run(self, test_file: Path, repo: Path) -> RunResult:
                return RunResult(
                    passed=False, returncode=1,
                    failure_category="assert", assert_expected_kind="value",
                )

        with TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            result = Mutagent(Runner(), _Adapter()).grade(
                t_ref=self._write_ref(tmp_path),
                repo_patched=tmp_path,
                repo_base=tmp_path,
                contract=Contract(),
                workdir=_mkdir(tmp_path / "wd"),
            )
        self.assertFalse(result.passed)
        self.assertIs(result.outcome, Outcome.FAIL_BEHAVIORAL)


if __name__ == "__main__":
    unittest.main()
