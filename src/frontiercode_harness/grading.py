"""Host-side LLM rubric grading for completed Harbor rollouts.

The in-container deterministic verifier (`run_criteria.py`) records `llm_prompt`
rubric items as *not evaluated* — it has no LLM in the loop. This module fills
those items in after the fact: for each trial it locates the captured
`submission.patch`, runs the FrontierCode rubric judge over it, and re-aggregates
the trial so the quality rubric actually contributes to the score.

This is what turns the benchmark from a correctness+scope gate into a
quality-aware FrontierCode-style grade.
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

from .llm import LLMJudgeError, judge_diff
from .manifest import ManifestError, load_manifest
from .models import CriterionResult, FrontierCodeResult, Manifest
from .qa import discover_task_paths
from .scoring import aggregate_criterion_results


SUBMISSION_PATCH_NAME = "submission.patch"


def index_task_manifests(task_root: Path) -> dict[str, tuple[Path, Manifest]]:
    """Map task_id (and directory name) -> (task_path, Manifest)."""
    index: dict[str, tuple[Path, Manifest]] = {}
    for task_path in discover_task_paths(task_root):
        try:
            manifest = load_manifest(task_path)
        except (ManifestError, FileNotFoundError, ValueError):
            continue
        entry = (task_path, manifest)
        if manifest.task_id:
            index[manifest.task_id] = entry
        index.setdefault(task_path.name, entry)
    return index


def find_submission_patch(result: FrontierCodeResult) -> Path | None:
    """Locate the submission.patch captured for a trial result."""
    candidates: list[Path] = []
    source = result.metadata.get("source")
    if source:
        source_path = Path(str(source))
        candidates.append(source_path.parent / SUBMISSION_PATCH_NAME)
    trial_dir = result.metadata.get("trial_dir")
    if trial_dir:
        candidates.append(Path(str(trial_dir)))
    for candidate in candidates:
        if candidate.is_file() and candidate.name == SUBMISSION_PATCH_NAME:
            return candidate
        search_root = candidate if candidate.is_dir() else candidate.parent
        if search_root.is_dir():
            for found in sorted(search_root.rglob(SUBMISSION_PATCH_NAME)):
                return found
    return None


def grade_results_with_llm(
    results: Iterable[FrontierCodeResult],
    *,
    task_root: Path,
    judge_model: str | None = None,
    cache_root: Path | None = None,
) -> tuple[list[FrontierCodeResult], dict[str, int]]:
    """Return results with llm_prompt criteria graded from each captured patch.

    The second element is a small stats dict for surfacing what happened
    (graded / skipped_no_patch / skipped_no_manifest / judge_errors).
    """
    manifests = index_task_manifests(task_root)
    stats = {
        "trials": 0,
        "graded": 0,
        "skipped_no_manifest": 0,
        "skipped_no_patch": 0,
        "skipped_no_llm_criteria": 0,
        "judge_errors": 0,
    }
    graded_results: list[FrontierCodeResult] = []
    for result in results:
        stats["trials"] += 1
        entry = manifests.get(result.task_id)
        if entry is None:
            stats["skipped_no_manifest"] += 1
            graded_results.append(result)
            continue
        task_path, manifest = entry
        llm_criteria = {c.id: c for c in manifest.criteria if c.method == "llm_prompt"}
        if not llm_criteria:
            stats["skipped_no_llm_criteria"] += 1
            graded_results.append(result)
            continue
        patch_path = find_submission_patch(result)
        if patch_path is None:
            stats["skipped_no_patch"] += 1
            graded_results.append(result)
            continue
        patch_text = patch_path.read_text(encoding="utf-8", errors="replace")
        cache_dir = (cache_root or task_path / ".frontiercode-cache") / "llm"

        new_criteria: list[CriterionResult] = []
        graded_any = False
        for criterion_result in result.criteria_results:
            criterion = llm_criteria.get(criterion_result.criterion_id)
            if criterion is None:
                new_criteria.append(criterion_result)
                continue
            try:
                judged = judge_diff(
                    criterion,
                    patch_text,
                    cache_dir=cache_dir,
                    task_id=result.task_id,
                    submission_id=result.submission_id or "submission",
                    model=judge_model,
                )
                new_criteria.append(judged)
                graded_any = True
            except (LLMJudgeError, OSError):
                stats["judge_errors"] += 1
                new_criteria.append(criterion_result)

        # Add any llm criteria that the in-container result never recorded.
        recorded = {item.criterion_id for item in result.criteria_results}
        for criterion_id, criterion in llm_criteria.items():
            if criterion_id in recorded:
                continue
            try:
                new_criteria.append(
                    judge_diff(
                        criterion,
                        patch_text,
                        cache_dir=cache_dir,
                        task_id=result.task_id,
                        submission_id=result.submission_id or "submission",
                        model=judge_model,
                    )
                )
                graded_any = True
            except (LLMJudgeError, OSError):
                stats["judge_errors"] += 1

        if not graded_any:
            graded_results.append(result)
            continue
        stats["graded"] += 1
        metadata = dict(result.metadata)
        metadata["llm_graded"] = True
        graded_results.append(
            aggregate_criterion_results(
                result.task_id,
                result.submission_id,
                tuple(new_criteria),
                metadata=metadata,
            )
        )
    return graded_results, stats
