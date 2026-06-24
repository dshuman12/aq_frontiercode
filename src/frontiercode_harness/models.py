from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


SUPPORTED_METHODS = {
    "classical",
    "command",
    "reverse_classical",
    "adaptive_classical",
    "scope",
    "llm_prompt",
}

SUPPORTED_CRITERION_CATEGORIES = {"patch_specific", "regular"}
DEFAULT_CRITERION_CATEGORY = "regular"
NEGATIVE_CALIBRATION_TYPES = {"hack", "low_quality", "negative"}
ALTERNATIVE_VALID_TYPE = "alternative_valid"


@dataclass(frozen=True)
class Criterion:
    id: str
    description: str
    method: str
    blocker: bool
    weight: float = 1.0
    threshold: float = 1.0
    command: str | None = None
    prompt: str | None = None
    allowed_paths: tuple[str, ...] = ()
    denied_paths: tuple[str, ...] = ()
    max_files: int | None = None
    max_changed_lines: int | None = None
    category: str = DEFAULT_CRITERION_CATEGORY
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Calibration:
    id: str
    type: str
    description: str = ""
    patch: str | None = None
    result_path: str | None = None
    criteria_results: tuple[dict[str, Any], ...] = ()
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Manifest:
    task_id: str
    subset: str
    repo_workdir: str
    criteria: tuple[Criterion, ...]
    low_quality_threshold: float = 0.5
    calibrations: tuple[Calibration, ...] = ()
    base_commit: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def criterion_ids(self) -> set[str]:
        return {criterion.id for criterion in self.criteria}


@dataclass(frozen=True)
class CriterionResult:
    criterion_id: str
    passed: bool
    score: float
    blocker: bool
    weight: float
    details: str = ""
    method: str = ""
    category: str = DEFAULT_CRITERION_CATEGORY


@dataclass(frozen=True)
class FrontierCodeResult:
    task_id: str
    submission_id: str
    passed: bool
    score: float
    reward: float
    blocker_failures: tuple[str, ...]
    criteria_results: tuple[CriterionResult, ...]
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "task_id": self.task_id,
            "submission_id": self.submission_id,
            "pass": self.passed,
            "score": self.score,
            "reward": self.reward,
            "blocker_failures": list(self.blocker_failures),
            "criteria_results": [
                {
                    "criterion_id": item.criterion_id,
                    "passed": item.passed,
                    "score": item.score,
                    "blocker": item.blocker,
                    "weight": item.weight,
                    "details": item.details,
                    "method": item.method,
                    "category": item.category,
                }
                for item in self.criteria_results
            ],
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "FrontierCodeResult":
        criteria = []
        for item in data.get("criteria_results", []):
            criteria.append(
                CriterionResult(
                    criterion_id=str(item["criterion_id"]),
                    passed=bool(item["passed"]),
                    score=float(item.get("score", 1.0 if item["passed"] else 0.0)),
                    blocker=bool(item.get("blocker", False)),
                    weight=float(item.get("weight", 1.0)),
                    details=str(item.get("details", "")),
                    method=str(item.get("method", "")),
                    category=str(item.get("category", DEFAULT_CRITERION_CATEGORY)),
                )
            )
        raw_score = float(data.get("score", 0.0))
        criteria_t = tuple(criteria)
        # FrontierCode ground truth: a solution that fails any blocker criterion receives score 0.
        blocker_failed = any(item.blocker and not item.passed for item in criteria_t) or bool(
            data.get("blocker_failures")
        )
        score = 0.0 if blocker_failed else _weighted_score_from_criteria(criteria_t, raw_score)
        return cls(
            task_id=str(data.get("task_id", "")),
            submission_id=str(data.get("submission_id", "")),
            passed=bool(data.get("pass", data.get("passed", False))),
            score=score,
            reward=float(data.get("reward", 1.0 if data.get("pass", False) else 0.0)),
            blocker_failures=tuple(str(item) for item in data.get("blocker_failures", [])),
            criteria_results=criteria_t,
            metadata=dict(data.get("metadata", {})),
        )


@dataclass(frozen=True)
class TaskQAReport:
    task_path: Path
    task_id: str
    passed: bool
    errors: tuple[str, ...]
    warnings: tuple[str, ...]
    calibration_results: tuple[FrontierCodeResult, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "task_path": str(self.task_path),
            "task_id": self.task_id,
            "passed": self.passed,
            "errors": list(self.errors),
            "warnings": list(self.warnings),
            "calibration_results": [item.to_dict() for item in self.calibration_results],
        }


def _weighted_score_from_criteria(
    criteria: tuple[CriterionResult, ...],
    fallback: float,
) -> float:
    weight_total = sum(max(item.weight, 0.0) for item in criteria)
    if weight_total <= 0:
        return fallback
    return (
        sum(_clamp_score(item.score) * max(item.weight, 0.0) for item in criteria)
        / weight_total
    )


def _clamp_score(value: float) -> float:
    return max(0.0, min(1.0, value))
