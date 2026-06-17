from __future__ import annotations

from typing import Any

from .models import Criterion, CriterionResult, FrontierCodeResult, Manifest


def aggregate_results(
    manifest: Manifest,
    raw_results: list[dict[str, Any]],
    submission_id: str,
) -> FrontierCodeResult:
    by_id = {str(item["criterion_id"]): item for item in raw_results}
    criterion_results = []
    for criterion in manifest.criteria:
        raw = by_id.get(criterion.id)
        if raw is None:
            passed = False
            score = 0.0
            details = "Missing criterion result"
        else:
            score = _clamp_score(float(raw.get("score", 1.0 if raw.get("passed") else 0.0)))
            passed = bool(raw.get("passed", score >= criterion.threshold))
            details = str(raw.get("details", ""))
        criterion_results.append(
            CriterionResult(
                criterion_id=criterion.id,
                passed=passed,
                score=score,
                blocker=criterion.blocker,
                weight=criterion.weight,
                details=details,
                method=criterion.method,
                category=criterion.category,
            )
        )
    return aggregate_criterion_results(manifest.task_id, submission_id, tuple(criterion_results))


def aggregate_criterion_results(
    task_id: str,
    submission_id: str,
    criterion_results: tuple[CriterionResult, ...],
    metadata: dict[str, Any] | None = None,
) -> FrontierCodeResult:
    blocker_failures = tuple(
        item.criterion_id for item in criterion_results if item.blocker and not item.passed
    )
    passed = not blocker_failures
    weight_total = sum(max(item.weight, 0.0) for item in criterion_results)
    if not passed or weight_total <= 0:
        score = 0.0
    else:
        score = sum(_clamp_score(item.score) * max(item.weight, 0.0) for item in criterion_results)
        score = score / weight_total
    return FrontierCodeResult(
        task_id=task_id,
        submission_id=submission_id,
        passed=passed,
        score=score,
        reward=1.0 if passed else 0.0,
        blocker_failures=blocker_failures,
        criteria_results=criterion_results,
        metadata=metadata or {},
    )


def criterion_result_from_bool(
    criterion: Criterion,
    passed: bool,
    details: str = "",
    score: float | None = None,
) -> CriterionResult:
    return CriterionResult(
        criterion_id=criterion.id,
        passed=passed,
        score=_clamp_score(1.0 if score is None and passed else 0.0 if score is None else score),
        blocker=criterion.blocker,
        weight=criterion.weight,
        details=details,
        method=criterion.method,
        category=criterion.category,
    )


def _clamp_score(value: float) -> float:
    return max(0.0, min(1.0, value))
