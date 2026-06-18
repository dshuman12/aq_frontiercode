"""
mutagent — adaptive classical grading.

Aligns a reference test to an agent's incidental implementation choices
(names, strings, call idiom) so a correct-but-non-canonical solution isn't
failed for cosmetic reasons — WITHOUT ever letting a broken solution pass by
weakening an assertion.

Pipeline (see PIPELINE.md):
  1. Baseline      — run T_ref on repo_patched. Pass -> score with T_ref.
  2. Filter        — front-door guard: cosmetic -> adapt; behavioral -> fail.
  3. Adapt         — LLM proposes a minimal diff to T_adapted.
  4. Guardrail     — (c) static diff check, (a) pass on fix, (b) fail on base.
  5. Freeze+score  — run the one validated file, deterministically, log diff.

The only nondeterministic step is 3. Everything that produces the final grade
operates on a frozen file with no LLM in the path.
"""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Callable, Optional, Protocol

from .static_diff import StaticDiffChecker, StaticDiffVerdict


# --------------------------------------------------------------------------- #
# Data types
# --------------------------------------------------------------------------- #

class Outcome(str, Enum):
    PASS_NO_ADAPT = "pass_no_adaptation"      # step 1 passed as-is
    PASS_ADAPTED = "pass_adapted"             # adapted, validated, scored pass
    FAIL_BEHAVIORAL = "fail_behavioral"       # step 2: real behavioral failure
    FAIL_UNCERTIFIABLE = "fail_uncertifiable" # step 4: adaptation rejected
    FAIL_SCORED = "fail_scored"               # frozen file failed at step 5


class FailureKind(str, Enum):
    COSMETIC = "cosmetic"        # rename / import / string-literal wording
    BEHAVIORAL = "behavioral"    # wrong value / count / bool / stream
    UNKNOWN = "unknown"          # fail closed -> treated as behavioral


@dataclass
class Contract:
    """What mutagent may and may not touch for THIS task."""
    # token kinds the LLM is allowed to change
    allowed_kinds: frozenset[str] = frozenset(
        {"identifier", "string_literal", "import_path", "call_syntax"}
    )
    # symbols the adaptation is expected to live in/around (slice + sanity)
    target_symbols: tuple[str, ...] = ()
    # task-specific load-bearing strings: cosmetic-looking but NOT adaptable.
    # e.g. a task whose whole point is an exact error-message wording.
    denied_string_literals: tuple[str, ...] = ()


@dataclass
class RunResult:
    passed: bool
    returncode: int
    stdout: str = ""
    stderr: str = ""
    # structured failure data, filled by the runner when available
    failure_category: Optional[str] = None   # "compile" | "link" | "assert" | ...
    assert_expected_kind: Optional[str] = None  # "string_literal" | "value" | ...


@dataclass
class GradeResult:
    outcome: Outcome
    passed: bool
    scored_file: Optional[Path] = None
    diff: str = ""                 # T_ref -> T_adapted (audit trail; "" if none)
    reason: str = ""
    log: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------- #
# Pluggable collaborators (you supply real ones; stubs provided for tests)
# --------------------------------------------------------------------------- #

class TestRunner(Protocol):
    def run(self, test_file: Path, repo: Path) -> RunResult:
        """Run `test_file` against `repo`, deterministically."""
        ...


class LLMAdapter(Protocol):
    def propose_diff(
        self,
        failing_test: str,
        failure_output: str,
        agent_code_slice: str,
        contract: Contract,
    ) -> str:
        """Return a unified diff against T_adapted. Diff only — no prose."""
        ...


# --------------------------------------------------------------------------- #
# Step 2 — failure classifier (deterministic, rule-based, NOT an LLM)
# --------------------------------------------------------------------------- #

def classify_failure(result: RunResult, contract: Contract) -> FailureKind:
    """
    Front-door guard. Decide whether a failure is eligible for adaptation.

    Rules, in order:
      1. Build/link/import error -> code never ran -> cosmetic (rename-ish).
      2. Assertion that failed on a *string literal* -> cosmetic wording...
         UNLESS that string is on the contract denylist (task is about it).
      3. Assertion on a value/count/bool/stream -> behavioral.
      4. Anything else -> unknown -> fail closed (behavioral).
    """
    cat = (result.failure_category or "").lower()

    if cat in {"compile", "link", "import", "symbol"}:
        return FailureKind.COSMETIC

    if cat == "assert":
        if result.assert_expected_kind == "string_literal":
            # task-specific override: a load-bearing string is NOT cosmetic
            blob = (result.stdout + result.stderr)
            if any(s in blob for s in contract.denied_string_literals):
                return FailureKind.BEHAVIORAL
            return FailureKind.COSMETIC
        return FailureKind.BEHAVIORAL

    return FailureKind.UNKNOWN  # fail closed


# --------------------------------------------------------------------------- #
# The pipeline
# --------------------------------------------------------------------------- #

class Mutagent:
    def __init__(
        self,
        runner: TestRunner,
        adapter: LLMAdapter,
        checker: Optional[StaticDiffChecker] = None,
        slice_fn: Optional[Callable[[Path, Contract], str]] = None,
        max_retries: int = 1,
    ):
        self.runner = runner
        self.adapter = adapter
        self.checker = checker or StaticDiffChecker()
        self.slice_fn = slice_fn or _default_slice
        self.max_retries = max_retries

    def grade(
        self,
        t_ref: Path,
        repo_patched: Path,
        repo_base: Path,
        contract: Contract,
        workdir: Optional[Path] = None,
    ) -> GradeResult:
        log: list[str] = []
        workdir = workdir or Path(tempfile.mkdtemp(prefix="mutagent_"))

        # -- Step 1: baseline ------------------------------------------------
        base_run = self.runner.run(t_ref, repo_patched)
        log.append(f"[1] T_ref on repo_patched: passed={base_run.passed}")
        if base_run.passed:
            return self._freeze_and_score(
                t_ref, repo_patched, diff="", log=log,
                adapted=False, contract=contract, workdir=workdir,
            )

        # -- Step 2: filter --------------------------------------------------
        kind = classify_failure(base_run, contract)
        log.append(f"[2] failure classified as: {kind.value}")
        if kind is not FailureKind.COSMETIC:
            return GradeResult(
                outcome=Outcome.FAIL_BEHAVIORAL, passed=False,
                reason=f"failure is {kind.value}; not eligible for adaptation",
                log=log,
            )

        # -- Steps 3 & 4 (with optional retries) -----------------------------
        failure_output = base_run.stdout + "\n" + base_run.stderr
        code_slice = self.slice_fn(repo_patched, contract)
        feedback = ""

        for attempt in range(self.max_retries + 1):
            t_adapted = workdir / f"T_adapted_{attempt}{t_ref.suffix}"
            shutil.copy2(t_ref, t_adapted)

            # -- Step 3: adapt -----------------------------------------------
            diff = self.adapter.propose_diff(
                failing_test=t_ref.read_text(),
                failure_output=failure_output + feedback,
                agent_code_slice=code_slice,
                contract=contract,
            )
            log.append(f"[3] attempt {attempt}: got {len(diff)} bytes of diff")

            # -- Step 4c: static diff inspection (cheap, FIRST) --------------
            verdict: StaticDiffVerdict = self.checker.inspect(diff, contract)
            log.append(f"[4c] static check: ok={verdict.ok} ({verdict.reason})")
            if not verdict.ok:
                feedback = f"\n[rejected: {verdict.reason}]"
                continue

            apply_unified_diff(diff, t_adapted)

            # -- Step 4a: passes on the fix ----------------------------------
            run_fix = self.runner.run(t_adapted, repo_patched)
            log.append(f"[4a] T_adapted on repo_patched: passed={run_fix.passed}")
            if not run_fix.passed:
                feedback = "\n[rejected: adapted test still fails on the fix]"
                continue

            # -- Step 4b: still fails on broken base -------------------------
            run_base = self.runner.run(t_adapted, repo_base)
            log.append(f"[4b] T_adapted on repo_base: passed={run_base.passed}")
            if run_base.passed:
                # the load-bearing check: adaptation weakened the assertion
                feedback = "\n[rejected: adapted test passes on broken base]"
                continue

            # -- Step 5: freeze + score --------------------------------------
            return self._freeze_and_score(
                t_adapted, repo_patched,
                diff=unified_diff(t_ref, t_adapted),
                log=log, adapted=True, contract=contract, workdir=workdir,
            )

        return GradeResult(
            outcome=Outcome.FAIL_UNCERTIFIABLE, passed=False,
            reason="no valid adaptation within retry budget", log=log,
        )

    # ----------------------------------------------------------------------- #
    def _freeze_and_score(
        self, scored_file: Path, repo_patched: Path, diff: str,
        log: list[str], adapted: bool, contract: Contract, workdir: Path,
    ) -> GradeResult:
        frozen = workdir / f"FROZEN_{scored_file.name}"
        shutil.copy2(scored_file, frozen)
        (workdir / "adaptation.diff").write_text(diff)  # audit trail

        final = self.runner.run(frozen, repo_patched)   # deterministic, no LLM
        log.append(f"[5] scored frozen file: passed={final.passed}")

        if final.passed:
            outcome = Outcome.PASS_ADAPTED if adapted else Outcome.PASS_NO_ADAPT
        else:
            outcome = Outcome.FAIL_SCORED
        return GradeResult(
            outcome=outcome, passed=final.passed,
            scored_file=frozen, diff=diff, log=log,
            reason="scored from frozen file",
        )


# --------------------------------------------------------------------------- #
# Small helpers (replace with your harness's real diff/slice utilities)
# --------------------------------------------------------------------------- #

def _default_slice(repo: Path, contract: Contract) -> str:
    """Naive slice: grep the target symbols. Replace with AST-aware slicing."""
    out = []
    for sym in contract.target_symbols:
        try:
            res = subprocess.run(
                ["grep", "-rn", "-A", "8", sym, str(repo / "src")],
                capture_output=True, text=True, timeout=10,
            )
            out.append(res.stdout)
        except Exception:
            pass
    return "\n".join(out)[:8000]


def apply_unified_diff(diff: str, target: Path) -> None:
    """Apply a unified diff to a single file via `patch`."""
    subprocess.run(
        ["patch", str(target)], input=diff, text=True,
        capture_output=True, check=True,
    )


def unified_diff(a: Path, b: Path) -> str:
    res = subprocess.run(
        ["diff", "-u", str(a), str(b)], capture_output=True, text=True
    )
    return res.stdout
