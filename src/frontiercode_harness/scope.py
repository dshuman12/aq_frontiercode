from __future__ import annotations

from dataclasses import dataclass
from pathlib import PurePosixPath

from .models import Criterion, CriterionResult
from .scoring import criterion_result_from_bool


@dataclass(frozen=True)
class PatchStats:
    changed_paths: tuple[str, ...]
    changed_lines: int


def evaluate_scope_from_patch(criterion: Criterion, patch_text: str) -> CriterionResult:
    stats = parse_patch_stats(patch_text)
    errors = []
    if criterion.max_files is not None and len(stats.changed_paths) > criterion.max_files:
        errors.append(f"changed {len(stats.changed_paths)} files > max_files {criterion.max_files}")
    if (
        criterion.max_changed_lines is not None
        and stats.changed_lines > criterion.max_changed_lines
    ):
        errors.append(
            f"changed {stats.changed_lines} lines > max_changed_lines {criterion.max_changed_lines}"
        )
    for path in stats.changed_paths:
        if criterion.allowed_paths and not any(_path_matches(path, allowed) for allowed in criterion.allowed_paths):
            errors.append(f"{path} is outside allowed paths {list(criterion.allowed_paths)}")
        if any(_path_matches(path, denied) for denied in criterion.denied_paths):
            errors.append(f"{path} matches denied paths {list(criterion.denied_paths)}")
    return criterion_result_from_bool(
        criterion,
        not errors,
        details="; ".join(errors) if errors else "Scope constraints satisfied",
    )


def parse_patch_stats(patch_text: str) -> PatchStats:
    paths: list[str] = []
    changed_lines = 0
    for line in patch_text.splitlines():
        if line.startswith("diff --git "):
            parts = line.split()
            if len(parts) >= 4:
                path = parts[3]
                if path.startswith("b/"):
                    path = path[2:]
                if path not in paths:
                    paths.append(path)
        elif line.startswith("+") and not line.startswith("+++"):
            changed_lines += 1
        elif line.startswith("-") and not line.startswith("---"):
            changed_lines += 1
    return PatchStats(changed_paths=tuple(paths), changed_lines=changed_lines)


def _path_matches(path: str, pattern: str) -> bool:
    clean_pattern = pattern.strip()
    if not clean_pattern:
        return False
    posix_path = PurePosixPath(path)
    if clean_pattern.endswith("/"):
        return path == clean_pattern[:-1] or path.startswith(clean_pattern)
    return posix_path.match(clean_pattern) or path == clean_pattern or path.startswith(clean_pattern.rstrip("*"))

