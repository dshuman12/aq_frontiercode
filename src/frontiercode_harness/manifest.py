from __future__ import annotations

import ast
import json
import re
import tomllib
from pathlib import Path
from typing import Any

from .models import (
    DEFAULT_CRITERION_CATEGORY,
    SUPPORTED_CRITERION_CATEGORIES,
    SUPPORTED_METHODS,
    Calibration,
    Criterion,
    Manifest,
)


MANIFEST_CANDIDATES = (
    "tests/grader/frontiercode.yaml",
    "tests/grader/frontiercode.yml",
    "tests/grader/frontiercode.json",
    "tests/grader/frontiercode.toml",
)


class ManifestError(ValueError):
    pass


def find_manifest_path(task_dir: Path) -> Path:
    for relative in MANIFEST_CANDIDATES:
        candidate = task_dir / relative
        if candidate.exists():
            return candidate
    raise ManifestError(
        "Missing FrontierCode manifest. Expected one of: "
        + ", ".join(MANIFEST_CANDIDATES)
    )


def load_manifest(task_dir: Path) -> Manifest:
    manifest_path = find_manifest_path(task_dir)
    raw = _load_structured_file(manifest_path)
    return manifest_from_dict(raw, manifest_path)


def manifest_from_dict(raw: dict[str, Any], source: Path | None = None) -> Manifest:
    source_label = str(source) if source else "manifest"
    criteria_raw = raw.get("criteria")
    if not isinstance(criteria_raw, list) or not criteria_raw:
        raise ManifestError(f"{source_label}: `criteria` must be a non-empty list")

    criteria = tuple(_criterion_from_dict(item, source_label) for item in criteria_raw)
    seen = set()
    duplicates = []
    for criterion in criteria:
        if criterion.id in seen:
            duplicates.append(criterion.id)
        seen.add(criterion.id)
    if duplicates:
        raise ManifestError(f"{source_label}: duplicate criterion ids: {duplicates}")

    calibrations = tuple(
        _calibration_from_dict(item, source_label)
        for item in raw.get("calibrations", []) or []
    )

    return Manifest(
        task_id=str(raw.get("task_id") or raw.get("id") or ""),
        subset=str(raw.get("subset") or "extended"),
        repo_workdir=str(raw.get("repo_workdir") or "environment/repo"),
        base_commit=_optional_str(raw.get("base_commit")),
        low_quality_threshold=float(raw.get("low_quality_threshold", 0.5)),
        criteria=criteria,
        calibrations=calibrations,
        metadata={
            key: value
            for key, value in raw.items()
            if key
            not in {
                "task_id",
                "id",
                "subset",
                "repo_workdir",
                "base_commit",
                "low_quality_threshold",
                "criteria",
                "calibrations",
            }
        },
    )


def _criterion_from_dict(raw: dict[str, Any], source_label: str) -> Criterion:
    if not isinstance(raw, dict):
        raise ManifestError(f"{source_label}: each criterion must be a mapping")
    method = str(raw.get("method", "")).strip()
    if method not in SUPPORTED_METHODS:
        raise ManifestError(
            f"{source_label}: unsupported criterion method {method!r}; "
            f"supported methods: {sorted(SUPPORTED_METHODS)}"
        )
    criterion_id = str(raw.get("id", "")).strip()
    if not criterion_id:
        raise ManifestError(f"{source_label}: criterion is missing `id`")
    category = str(raw.get("category", DEFAULT_CRITERION_CATEGORY)).strip()
    if category not in SUPPORTED_CRITERION_CATEGORIES:
        raise ManifestError(
            f"{source_label}: criterion {criterion_id}: unsupported category {category!r}; "
            f"supported categories: {sorted(SUPPORTED_CRITERION_CATEGORIES)}"
        )

    scope = raw.get("scope", {}) or {}
    if not isinstance(scope, dict):
        raise ManifestError(f"{source_label}: criterion {criterion_id}: `scope` must be a mapping")

    return Criterion(
        id=criterion_id,
        description=str(raw.get("description", "")),
        method=method,
        blocker=bool(raw.get("blocker", False)),
        weight=float(raw.get("weight", 1.0)),
        threshold=float(raw.get("threshold", 1.0)),
        command=_optional_str(raw.get("command")),
        prompt=_optional_str(raw.get("prompt")),
        allowed_paths=tuple(str(item) for item in scope.get("allowed_paths", raw.get("allowed_paths", [])) or []),
        denied_paths=tuple(str(item) for item in scope.get("denied_paths", raw.get("denied_paths", [])) or []),
        max_files=_optional_int(scope.get("max_files", raw.get("max_files"))),
        max_changed_lines=_optional_int(scope.get("max_changed_lines", raw.get("max_changed_lines"))),
        category=category,
        metadata={
            key: value
            for key, value in raw.items()
            if key
            not in {
                "id",
                "description",
                "method",
                "blocker",
                "weight",
                "threshold",
                "command",
                "prompt",
                "scope",
                "allowed_paths",
                "denied_paths",
                "max_files",
                "max_changed_lines",
                "category",
            }
        },
    )


def _calibration_from_dict(raw: dict[str, Any], source_label: str) -> Calibration:
    if not isinstance(raw, dict):
        raise ManifestError(f"{source_label}: each calibration must be a mapping")
    calibration_id = str(raw.get("id", "")).strip()
    if not calibration_id:
        raise ManifestError(f"{source_label}: calibration is missing `id`")
    criteria_results = raw.get("criteria_results", ()) or ()
    if not isinstance(criteria_results, list):
        raise ManifestError(
            f"{source_label}: calibration {calibration_id}: `criteria_results` must be a list"
        )
    return Calibration(
        id=calibration_id,
        type=str(raw.get("type", "")).strip(),
        description=str(raw.get("description", "")),
        patch=_optional_str(raw.get("patch")),
        result_path=_optional_str(raw.get("result_path")),
        criteria_results=tuple(dict(item) for item in criteria_results),
        metadata={
            key: value
            for key, value in raw.items()
            if key
            not in {
                "id",
                "type",
                "description",
                "patch",
                "result_path",
                "criteria_results",
            }
        },
    )


def _load_structured_file(path: Path) -> dict[str, Any]:
    suffix = path.suffix.lower()
    text = path.read_text(encoding="utf-8")
    if suffix == ".json":
        data = json.loads(text)
    elif suffix == ".toml":
        data = tomllib.loads(text)
    elif suffix in {".yaml", ".yml"}:
        data = _load_yaml(text)
    else:
        raise ManifestError(f"Unsupported manifest extension: {path.suffix}")
    if not isinstance(data, dict):
        raise ManifestError(f"{path}: manifest root must be a mapping")
    return data


def _load_yaml(text: str) -> Any:
    try:
        import yaml  # type: ignore[import-not-found]
    except ModuleNotFoundError:
        return _parse_simple_yaml(text)
    return yaml.safe_load(text)


def _parse_simple_yaml(text: str) -> Any:
    lines = _prepare_yaml_lines(text)
    if not lines:
        return {}
    value, index = _parse_yaml_block(lines, 0, lines[0][0])
    if index != len(lines):
        raise ManifestError(f"Could not parse YAML near line {lines[index][2]}")
    return value


def _prepare_yaml_lines(text: str) -> list[tuple[int, str, int]]:
    prepared = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        stripped_comment = _strip_yaml_comment(line.rstrip())
        if not stripped_comment.strip():
            continue
        indent = len(stripped_comment) - len(stripped_comment.lstrip(" "))
        prepared.append((indent, stripped_comment.strip(), line_number))
    return prepared


def _parse_yaml_block(
    lines: list[tuple[int, str, int]], index: int, indent: int
) -> tuple[Any, int]:
    if index >= len(lines):
        return {}, index
    current_indent, current_text, _ = lines[index]
    if current_indent < indent:
        return {}, index
    if current_text.startswith("- "):
        return _parse_yaml_list(lines, index, indent)
    return _parse_yaml_mapping(lines, index, indent)


def _parse_yaml_mapping(
    lines: list[tuple[int, str, int]], index: int, indent: int
) -> tuple[dict[str, Any], int]:
    result: dict[str, Any] = {}
    while index < len(lines):
        current_indent, current_text, line_number = lines[index]
        if current_indent < indent:
            break
        if current_indent > indent:
            raise ManifestError(f"Unexpected indentation near YAML line {line_number}")
        if current_text.startswith("- "):
            break
        key, value_text = _split_yaml_key_value(current_text, line_number)
        index += 1
        if value_text in {"|", ">"}:
            value, index = _parse_yaml_block_scalar(lines, index, current_indent, folded=value_text == ">")
        elif value_text == "":
            if index < len(lines) and lines[index][0] > current_indent:
                value, index = _parse_yaml_block(lines, index, lines[index][0])
            else:
                value = {}
        else:
            value = _parse_yaml_scalar(value_text)
        result[key] = value
    return result, index


def _parse_yaml_list(
    lines: list[tuple[int, str, int]], index: int, indent: int
) -> tuple[list[Any], int]:
    result = []
    while index < len(lines):
        current_indent, current_text, line_number = lines[index]
        if current_indent < indent:
            break
        if current_indent != indent or not current_text.startswith("- "):
            break
        item_text = current_text[2:].strip()
        index += 1
        if item_text == "":
            if index < len(lines) and lines[index][0] > current_indent:
                item, index = _parse_yaml_block(lines, index, lines[index][0])
            else:
                item = None
        elif _looks_like_inline_mapping(item_text):
            key, value_text = _split_yaml_key_value(item_text, line_number)
            item = {key: _parse_yaml_scalar(value_text) if value_text else {}}
            if index < len(lines) and lines[index][0] > current_indent:
                nested, index = _parse_yaml_mapping(lines, index, lines[index][0])
                if not isinstance(nested, dict):
                    raise ManifestError(f"Expected mapping after list item near line {line_number}")
                item.update(nested)
        else:
            item = _parse_yaml_scalar(item_text)
            if index < len(lines) and lines[index][0] > current_indent:
                raise ManifestError(f"Unexpected nested block after scalar list item near line {line_number}")
        result.append(item)
    return result, index


def _parse_yaml_block_scalar(
    lines: list[tuple[int, str, int]], index: int, parent_indent: int, folded: bool
) -> tuple[str, int]:
    parts = []
    while index < len(lines):
        current_indent, current_text, _ = lines[index]
        if current_indent <= parent_indent:
            break
        parts.append(current_text)
        index += 1
    return (" ".join(parts) if folded else "\n".join(parts)), index


def _split_yaml_key_value(text: str, line_number: int) -> tuple[str, str]:
    match = re.match(r"^([^:]+):(.*)$", text)
    if not match:
        raise ManifestError(f"Expected `key: value` near YAML line {line_number}")
    return match.group(1).strip(), match.group(2).strip()


def _parse_yaml_scalar(value: str) -> Any:
    if value == "":
        return ""
    lowered = value.lower()
    if lowered in {"true", "false"}:
        return lowered == "true"
    if lowered in {"null", "none", "~"}:
        return None
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        return value[1:-1]
    if value.startswith("[") or value.startswith("{"):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return ast.literal_eval(value)
    try:
        if "." in value:
            return float(value)
        return int(value)
    except ValueError:
        return value


def _strip_yaml_comment(line: str) -> str:
    quote: str | None = None
    for index, char in enumerate(line):
        if char in {"'", '"'}:
            quote = None if quote == char else char
        elif char == "#" and quote is None and (index == 0 or line[index - 1].isspace()):
            return line[:index].rstrip()
    return line


def _looks_like_inline_mapping(text: str) -> bool:
    return ":" in text and not text.startswith(("http://", "https://"))


def _optional_str(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def _optional_int(value: Any) -> int | None:
    if value is None:
        return None
    return int(value)
