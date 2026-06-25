from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from .manifest import ManifestError, load_manifest
from .models import (
    ALTERNATIVE_VALID_TYPE,
    NEGATIVE_CALIBRATION_TYPES,
    Calibration,
    Criterion,
    CriterionResult,
    FrontierCodeResult,
    Manifest,
    TaskQAReport,
)
from .scope import evaluate_scope_from_patch
from .scoring import aggregate_results, aggregate_criterion_results, criterion_result_from_bool


def qa_dataset(dataset_path: Path, *, enable_llm: bool = False) -> list[TaskQAReport]:
    task_paths = discover_task_paths(dataset_path)
    return [qa_task(path, enable_llm=enable_llm) for path in task_paths]


def discover_task_paths(path: Path) -> list[Path]:
    if (path / "task.toml").exists() or (path / "instruction.md").exists():
        return [path]
    children = [
        item
        for item in sorted(path.iterdir())
        if item.is_dir() and ((item / "task.toml").exists() or (item / "instruction.md").exists())
    ]
    return children or [path]


def qa_task(task_path: Path, *, enable_llm: bool = False) -> TaskQAReport:
    errors: list[str] = []
    warnings: list[str] = []
    calibration_results: list[FrontierCodeResult] = []
    manifest: Manifest | None = None

    if (task_path / "solution").exists():
        errors.append("`solution/` folders are not allowed for FrontierCode Harbor tasks")
    for required in ("task.toml", "instruction.md", "environment/repo", "tests/test.sh"):
        if not (task_path / required).exists():
            errors.append(f"Missing required path: {required}")

    try:
        manifest = load_manifest(task_path)
    except ManifestError as exc:
        errors.append(str(exc))

    if manifest is not None:
        errors.extend(_validate_manifest(manifest))
        calibration_errors, calibration_warnings, calibration_results = _validate_calibrations(
            task_path, manifest, enable_llm=enable_llm
        )
        errors.extend(calibration_errors)
        warnings.extend(calibration_warnings)

    task_id = manifest.task_id if manifest is not None and manifest.task_id else task_path.name
    return TaskQAReport(
        task_path=task_path,
        task_id=task_id,
        passed=not errors,
        errors=tuple(errors),
        warnings=tuple(warnings),
        calibration_results=tuple(calibration_results),
    )


def _validate_manifest(manifest: Manifest) -> list[str]:
    errors = []
    if not manifest.task_id:
        errors.append("Manifest is missing `task_id`")
    if not any(criterion.blocker for criterion in manifest.criteria):
        errors.append("Manifest must define at least one blocker criterion")
    if not 0 <= manifest.low_quality_threshold <= 1:
        errors.append("`low_quality_threshold` must be between 0 and 1")
    for criterion in manifest.criteria:
        if criterion.weight <= 0:
            errors.append(f"Criterion {criterion.id}: weight must be positive")
        if not 0 <= criterion.threshold <= 1:
            errors.append(f"Criterion {criterion.id}: threshold must be between 0 and 1")
        if criterion.method in {"classical", "command", "reverse_classical"} and not criterion.command:
            errors.append(f"Criterion {criterion.id}: {criterion.method} requires `command`")
        if criterion.method == "llm_prompt" and not (criterion.prompt or criterion.description):
            errors.append(f"Criterion {criterion.id}: llm_prompt requires `prompt` or description")
        if criterion.method == "adaptive_classical" and not criterion.command:
            errors.append(f"Criterion {criterion.id}: adaptive_classical requires `command`")
    return errors


def _validate_calibrations(
    task_path: Path,
    manifest: Manifest,
    *,
    enable_llm: bool,
) -> tuple[list[str], list[str], list[FrontierCodeResult]]:
    errors: list[str] = []
    warnings: list[str] = []
    results: list[FrontierCodeResult] = []
    negative_calibrations = [
        item for item in manifest.calibrations if item.type in NEGATIVE_CALIBRATION_TYPES
    ]
    alternative_valid = [
        item for item in manifest.calibrations if item.type == ALTERNATIVE_VALID_TYPE
    ]
    if not negative_calibrations:
        errors.append("At least one hack/low_quality/negative calibration is required")
    if not alternative_valid:
        errors.append("At least one alternative_valid calibration is required")

    for calibration in manifest.calibrations:
        if calibration.type not in NEGATIVE_CALIBRATION_TYPES | {ALTERNATIVE_VALID_TYPE}:
            errors.append(
                f"Calibration {calibration.id}: unsupported type {calibration.type!r}"
            )
            continue
        result = _evaluate_calibration(task_path, manifest, calibration, enable_llm=enable_llm)
        if result is None:
            errors.append(
                f"Calibration {calibration.id}: missing evaluated result evidence; "
                "provide criteria_results, result_path, or an executable patch calibration"
            )
            continue
        results.append(result)
        if calibration.type in NEGATIVE_CALIBRATION_TYPES:
            if result.passed and result.score >= manifest.low_quality_threshold:
                errors.append(
                    f"Calibration {calibration.id}: negative calibration passed blockers "
                    f"and scored {result.score:.3f}, expected blocker failure or score "
                    f"< {manifest.low_quality_threshold:.3f}"
                )
        elif calibration.type == ALTERNATIVE_VALID_TYPE:
            if not result.passed:
                errors.append(
                    f"Calibration {calibration.id}: alternative_valid calibration failed "
                    f"blockers {list(result.blocker_failures)}"
                )
    return errors, warnings, results


def _evaluate_calibration(
    task_path: Path,
    manifest: Manifest,
    calibration: Calibration,
    *,
    enable_llm: bool,
) -> FrontierCodeResult | None:
    if calibration.criteria_results:
        return aggregate_results(
            manifest,
            [dict(item) for item in calibration.criteria_results],
            submission_id=calibration.id,
        )
    if calibration.result_path:
        result_path = task_path / "tests/grader" / calibration.result_path
        if not result_path.exists():
            result_path = task_path / calibration.result_path
        data = json.loads(result_path.read_text(encoding="utf-8"))
        return FrontierCodeResult.from_dict(data)
    if calibration.patch:
        return _evaluate_patch_calibration(task_path, manifest, calibration, enable_llm=enable_llm)
    return None


def _evaluate_patch_calibration(
    task_path: Path,
    manifest: Manifest,
    calibration: Calibration,
    *,
    enable_llm: bool,
) -> FrontierCodeResult | None:
    patch_path = task_path / "tests/grader" / calibration.patch
    if not patch_path.exists():
        patch_path = task_path / calibration.patch
    if not patch_path.exists():
        return None
    patch_text = patch_path.read_text(encoding="utf-8")
    return _evaluate_patch_candidate(
        task_path,
        manifest,
        patch_text,
        submission_id=calibration.id,
        enable_llm=enable_llm,
        metadata={"calibration_type": calibration.type},
        patch_path=patch_path,
    )


def evaluate_patch_text(
    task_path: Path,
    manifest: Manifest,
    patch_text: str,
    *,
    submission_id: str,
    enable_llm: bool = False,
    metadata: dict[str, object] | None = None,
) -> FrontierCodeResult | None:
    """Evaluate an in-memory patch against the task criteria."""
    return _evaluate_patch_candidate(
        task_path,
        manifest,
        patch_text,
        submission_id=submission_id,
        enable_llm=enable_llm,
        metadata=metadata or {},
        patch_path=None,
    )


def _evaluate_patch_candidate(
    task_path: Path,
    manifest: Manifest,
    patch_text: str,
    *,
    submission_id: str,
    enable_llm: bool,
    metadata: dict[str, object],
    patch_path: Path | None,
) -> FrontierCodeResult | None:
    repo_path = task_path / manifest.repo_workdir
    if not repo_path.exists():
        return None
    with tempfile.TemporaryDirectory(prefix="frontiercode-calibration-") as tmp:
        tmp_path = Path(tmp)
        if patch_path is None:
            patch_path = tmp_path / "candidate.patch"
            patch_path.write_text(patch_text, encoding="utf-8")
        workdir = tmp_path / "repo"
        shutil.copytree(repo_path, workdir)
        apply_result = _apply_patch(workdir, patch_path)
        if apply_result.returncode != 0:
            failed = []
            for criterion in manifest.criteria:
                failed.append(
                    criterion_result_from_bool(
                        criterion,
                        False,
                        details=f"Could not apply calibration patch: {apply_result.stderr.strip()}",
                    )
                )
            return aggregate_criterion_results(
                manifest.task_id,
                submission_id,
                tuple(failed),
                metadata=metadata,
            )
        criterion_results: list[CriterionResult] = []
        for criterion in manifest.criteria:
            if criterion.method in {"classical", "command", "adaptive_classical"}:
                criterion_results.append(_run_command_criterion(workdir, criterion))
            elif criterion.method == "reverse_classical":
                criterion_results.append(
                    criterion_result_from_bool(
                        criterion,
                        False,
                        details="reverse_classical needs explicit result evidence in v1",
                    )
                )
            elif criterion.method == "scope":
                scope_result = evaluate_scope_from_patch(criterion, patch_text)
                if scope_result.passed and criterion.semantic and enable_llm:
                    scope_result = _evaluate_semantic_scope(
                        criterion,
                        patch_text,
                        task_path=task_path,
                        task_id=manifest.task_id,
                        submission_id=submission_id,
                        deterministic=scope_result,
                    )
                criterion_results.append(scope_result)
            elif criterion.method == "llm_prompt":
                if enable_llm:
                    from .llm import judge_diff

                    criterion_results.append(
                        judge_diff(
                            criterion,
                            patch_text,
                            cache_dir=task_path / ".frontiercode-cache" / "llm",
                            task_id=manifest.task_id,
                            submission_id=submission_id,
                        )
                    )
                elif criterion.blocker:
                    criterion_results.append(
                        criterion_result_from_bool(
                            criterion,
                            False,
                            details="LLM blocker criterion not evaluated; rerun with --enable-llm",
                        )
                    )
                else:
                    criterion_results.append(
                        criterion_result_from_bool(
                            criterion,
                            True,
                            details="LLM non-blocker skipped during deterministic QA",
                            score=1.0,
                        )
                    )
            else:
                criterion_results.append(
                    criterion_result_from_bool(
                        criterion,
                        False,
                        details=f"Unsupported criterion method: {criterion.method}",
                    )
                )
        return aggregate_criterion_results(
            manifest.task_id,
            submission_id,
            tuple(criterion_results),
            metadata=metadata,
        )


def _apply_patch(workdir: Path, patch_path: Path) -> subprocess.CompletedProcess[str]:
    commands = (
        ["git", "apply", "--whitespace=nowarn", str(patch_path)],
        ["patch", "-p1", "-i", str(patch_path)],
    )
    last_result: subprocess.CompletedProcess[str] | None = None
    for command in commands:
        timeout_seconds = 60 if command[0] == "git" else 10
        try:
            result = subprocess.run(
                command,
                cwd=workdir,
                text=True,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=timeout_seconds,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            result = subprocess.CompletedProcess(
                command,
                124,
                stdout=_timeout_output(exc.stdout),
                stderr=(
                    f"Patch apply command timed out after {timeout_seconds} seconds: "
                    + " ".join(command)
                ),
            )
        if result.returncode == 0:
            return result
        last_result = result
    assert last_result is not None
    return last_result


def _timeout_output(value: str | bytes | None) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value


def _evaluate_semantic_scope(
    criterion: Criterion,
    patch_text: str,
    *,
    task_path: Path,
    task_id: str,
    submission_id: str,
    deterministic: CriterionResult,
) -> CriterionResult:
    """Layer the LLM locality check on top of a passing deterministic scope result."""
    from .llm import LLMJudgeError, judge_diff

    semantic_criterion = replace(
        criterion,
        prompt=(
            "Score whether the change respects this locality constraint and makes no "
            f"unrelated edits: {criterion.semantic}"
        ),
    )
    try:
        verdict = judge_diff(
            semantic_criterion,
            patch_text,
            cache_dir=task_path / ".frontiercode-cache" / "llm",
            task_id=task_id,
            submission_id=submission_id,
        )
    except LLMJudgeError as exc:
        return criterion_result_from_bool(
            criterion,
            False,
            details=f"semantic scope check failed to run: {exc}",
            evaluated=False,
        )
    passed = deterministic.passed and verdict.passed
    details = f"{deterministic.details}; semantic: {verdict.details}".strip("; ")
    return CriterionResult(
        criterion_id=criterion.id,
        passed=passed,
        score=verdict.score if passed else 0.0,
        blocker=criterion.blocker,
        weight=criterion.weight,
        details=details,
        method=criterion.method,
        category=criterion.category,
        evaluated=True,
    )


def _run_command_criterion(workdir: Path, criterion: Criterion) -> CriterionResult:
    assert criterion.command is not None
    result = subprocess.run(
        criterion.command,
        cwd=workdir,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True,
        timeout=int(criterion.metadata.get("timeout_seconds", 300)),
        check=False,
    )
    details = "\n".join(part for part in (result.stdout.strip(), result.stderr.strip()) if part)
    return criterion_result_from_bool(
        criterion,
        result.returncode == 0,
        details=details or f"exit code {result.returncode}",
    )
