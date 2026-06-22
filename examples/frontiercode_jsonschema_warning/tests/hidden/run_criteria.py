#!/usr/bin/env python3
from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


TASK_ID = "jsonschema__log-warning-helper"
WEIGHT = 0.1


@dataclass(frozen=True)
class Criterion:
    id: str
    category: str
    description: str
    check: Callable[[Path, Path], tuple[bool, str]]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo", nargs="?", default=None)
    parser.add_argument("--criterion", choices=[item.id for item in criteria()])
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    repo = (Path(args.repo) if args.repo else script_dir.parents[1] / "environment" / "repo").resolve()
    selected = [item for item in criteria() if args.criterion in {None, item.id}]

    results = [evaluate_criterion(item, repo, script_dir) for item in selected]
    if args.criterion:
        result = results[0]
        print(result["details"])
        return 0 if result["passed"] else 1

    result_doc = build_result_doc(results)
    write_result_files(result_doc, repo, script_dir)
    return 0 if result_doc["pass"] else 1


def criteria() -> list[Criterion]:
    return [
        Criterion(
            "log_warning_signature",
            "patch_specific",
            "src/logger.h defines auto LOG_WARNING() -> std::ostream &.",
            check_log_warning_signature,
        ),
        Criterion(
            "log_warning_prefix",
            "patch_specific",
            "LOG_WARNING owns the warning: prefix.",
            check_log_warning_prefix,
        ),
        Criterion(
            "warn_unknown_keyword_uses_log_warning",
            "patch_specific",
            "warn_unknown_keyword uses LOG_WARNING.",
            check_warn_unknown_keyword,
        ),
        Criterion(
            "warn_removed_schema_identifiers_chained_log_warning",
            "patch_specific",
            "warn_removed_schema_identifiers uses one chained LOG_WARNING expression.",
            check_warn_removed_schema_identifiers,
        ),
        Criterion(
            "warn_dialect_fallback_uses_log_warning",
            "patch_specific",
            "warn_dialect_fallback uses LOG_WARNING.",
            check_warn_dialect_fallback,
        ),
        Criterion(
            "no_cpp_literal_warning_prefix",
            "patch_specific",
            "src/*.cpp files do not contain literal warning: prefixes.",
            check_no_cpp_literal_warning_prefix,
        ),
        Criterion(
            "project_builds_cleanly",
            "regular",
            "make clean and make configure compile pass.",
            check_project_builds_cleanly,
        ),
        Criterion(
            "clang_format_clean",
            "regular",
            "C++ source files are clang-format clean.",
            check_clang_format_clean,
        ),
        Criterion(
            "reference_tests_pass",
            "regular",
            "Hidden reference tests pass with make.",
            check_reference_tests_pass,
        ),
        Criterion(
            "reference_tests_fail_on_base",
            "regular",
            "Hidden reference tests fail on the base repo snapshot.",
            check_reference_tests_fail_on_base,
        ),
    ]


def evaluate_criterion(item: Criterion, repo: Path, script_dir: Path) -> dict:
    try:
        passed, details = item.check(repo, script_dir)
    except Exception as exc:
        passed = False
        details = f"{type(exc).__name__}: {exc}"
    return {
        "criterion_id": item.id,
        "passed": passed,
        "score": 1.0 if passed else 0.0,
        "blocker": True,
        "weight": WEIGHT,
        "details": details,
        "method": "command",
        "category": item.category,
    }


def build_result_doc(results: list[dict]) -> dict:
    passed = all(item["passed"] for item in results)
    category_counts: dict[str, dict[str, int]] = {}
    for result in results:
        counts = category_counts.setdefault(result["category"], {"passed": 0, "total": 0})
        counts["total"] += 1
        if result["passed"]:
            counts["passed"] += 1
    score_total = sum(item["weight"] for item in results)
    score = (
        sum(item["score"] * item["weight"] for item in results) / score_total
        if score_total
        else 0.0
    )
    return {
        "task_id": TASK_ID,
        "submission_id": "",
        "pass": passed,
        "score": score,
        "reward": 1.0 if passed else 0.0,
        "blocker_failures": [
            item["criterion_id"] for item in results if item["blocker"] and not item["passed"]
        ],
        "criteria_results": results,
        "metadata": {
            "criteria_passed": sum(1 for item in results if item["passed"]),
            "criteria_total": len(results),
            "category_counts": category_counts,
        },
    }


def write_result_files(result_doc: dict, repo: Path, script_dir: Path) -> None:
    log_dir = verifier_log_dir(repo)
    log_dir.mkdir(parents=True, exist_ok=True)
    (log_dir / "frontiercode_result.json").write_text(
        json.dumps(result_doc, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (log_dir / "reward.json").write_text(
        json.dumps({"reward": result_doc["reward"]}, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (log_dir / "submission.patch").write_text(
        render_submission_patch(script_dir / "base_repo", repo),
        encoding="utf-8",
    )


def verifier_log_dir(repo: Path) -> Path:
    candidates = []
    if os.environ.get("FRONTIERCODE_VERIFIER_LOG_DIR"):
        candidates.append(Path(os.environ["FRONTIERCODE_VERIFIER_LOG_DIR"]))
    candidates.append(Path("/logs/verifier"))
    candidates.append(repo.parent / "verifier-logs")
    for candidate in candidates:
        try:
            candidate.mkdir(parents=True, exist_ok=True)
        except OSError:
            continue
        return candidate
    return repo.parent / "verifier-logs"


def check_log_warning_signature(repo: Path, _: Path) -> tuple[bool, str]:
    logger = read_text(repo / "src" / "logger.h")
    pattern = r"auto\s+LOG_WARNING\s*\(\s*\)\s*->\s*std::ostream\s*&"
    if re.search(pattern, logger):
        return True, "LOG_WARNING has the required signature."
    return False, "src/logger.h must define auto LOG_WARNING() -> std::ostream &"


def check_log_warning_prefix(repo: Path, _: Path) -> tuple[bool, str]:
    logger = read_text(repo / "src" / "logger.h")
    body = function_body(logger, "LOG_WARNING")
    if "warning:" in body:
        return True, "LOG_WARNING owns the warning: prefix."
    return False, "LOG_WARNING must pre-print the warning: prefix."


def check_warn_unknown_keyword(repo: Path, _: Path) -> tuple[bool, str]:
    body = function_body(read_text(repo / "src" / "schema.cpp"), "warn_unknown_keyword")
    return check_single_warning_body(body, "warn_unknown_keyword")


def check_warn_removed_schema_identifiers(repo: Path, _: Path) -> tuple[bool, str]:
    body = function_body(read_text(repo / "src" / "schema.cpp"), "warn_removed_schema_identifiers")
    if "std::cerr" in body:
        return False, "multi-line warning body must not keep writing directly to std::cerr"
    if "LOG_VERBOSE()" in body:
        return False, "multi-line warning body must not use LOG_VERBOSE"
    if body.count("LOG_WARNING()") != 1:
        return False, "multi-line warning should use one chained LOG_WARNING() expression"
    if "warning:" in body:
        return False, "multi-line warning body should not hard-code the warning: prefix"
    return True, "multi-line warning uses one chained LOG_WARNING expression."


def check_warn_dialect_fallback(repo: Path, _: Path) -> tuple[bool, str]:
    body = function_body(read_text(repo / "src" / "schema.cpp"), "warn_dialect_fallback")
    return check_single_warning_body(body, "warn_dialect_fallback")


def check_no_cpp_literal_warning_prefix(repo: Path, _: Path) -> tuple[bool, str]:
    offenders = []
    for path in sorted((repo / "src").glob("*.cpp")):
        if "warning:" in read_text(path):
            offenders.append(str(path.relative_to(repo)))
    if offenders:
        return False, "literal warning: prefix remains in " + ", ".join(offenders)
    return True, "No src/*.cpp files contain literal warning: prefixes."


def check_project_builds_cleanly(repo: Path, _: Path) -> tuple[bool, str]:
    clean = run(["make", "clean"], repo)
    if clean.returncode != 0:
        return False, command_details("make clean failed", clean)
    compile_result = run(["make", "configure", "compile"], repo)
    if compile_result.returncode != 0:
        return False, command_details("make configure compile failed", compile_result)
    return True, "make clean and make configure compile passed."


def check_clang_format_clean(repo: Path, _: Path) -> tuple[bool, str]:
    if shutil.which("clang-format") is None:
        return False, "clang-format is not installed."
    sources = [
        repo / "src" / "logger.h",
        repo / "src" / "main.cpp",
        repo / "src" / "schema.cpp",
        repo / "src" / "schema.h",
    ]
    result = run(["clang-format", "--dry-run", "--Werror", *map(str, sources)], repo)
    if result.returncode != 0:
        return False, command_details("clang-format --dry-run --Werror failed", result)
    return True, "clang-format --dry-run --Werror passed."


def check_reference_tests_pass(repo: Path, script_dir: Path) -> tuple[bool, str]:
    with tempfile.TemporaryDirectory(prefix="frontiercode-reference-") as tmp:
        workdir = Path(tmp) / "repo"
        copy_repo(repo, workdir)
        install_reference_tests(script_dir, workdir)
        result = run(["make"], workdir)
    if result.returncode != 0:
        return False, command_details("hidden reference make failed", result)
    return True, "Hidden reference tests passed with make."


def check_reference_tests_fail_on_base(repo: Path, script_dir: Path) -> tuple[bool, str]:
    with tempfile.TemporaryDirectory(prefix="frontiercode-base-") as tmp:
        workdir = Path(tmp) / "repo"
        copy_repo(script_dir / "base_repo", workdir)
        install_reference_tests(script_dir, workdir)
        result = run(["make"], workdir)
    if result.returncode == 0:
        return False, "Hidden reference tests unexpectedly passed on the base repo snapshot."
    return True, "Hidden reference tests failed on the base repo snapshot as expected."


def render_submission_patch(base_repo: Path, submitted_repo: Path) -> str:
    diff_chunks = []
    all_files = sorted(index_files(base_repo) | index_files(submitted_repo))
    for relative in all_files:
        base_path = base_repo / relative
        submitted_path = submitted_repo / relative
        base_lines = read_patch_lines(base_path)
        submitted_lines = read_patch_lines(submitted_path)
        if base_lines == submitted_lines:
            continue
        diff_chunks.extend(
            difflib.unified_diff(
                base_lines,
                submitted_lines,
                fromfile=f"a/{relative.as_posix()}",
                tofile=f"b/{relative.as_posix()}",
            )
        )
    return "".join(diff_chunks)


def index_files(root: Path) -> set[Path]:
    if not root.exists():
        return set()
    ignored_dirs = {"build", ".git", "__pycache__", "verifier-logs"}
    ignored_files = {".DS_Store"}
    files = set()
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        if any(part in ignored_dirs for part in relative.parts):
            continue
        if path.name in ignored_files:
            continue
        files.add(relative)
    return files


def read_patch_lines(path: Path) -> list[str]:
    if not path.exists():
        return []
    try:
        return path.read_text(encoding="utf-8").splitlines(keepends=True)
    except UnicodeDecodeError:
        return [f"Binary file {path.name} differs\n"]


def check_single_warning_body(body: str, name: str) -> tuple[bool, str]:
    if "LOG_WARNING()" not in body:
        return False, f"{name} must call LOG_WARNING()"
    if "LOG_VERBOSE()" in body:
        return False, f"{name} must not use LOG_VERBOSE()"
    if "std::cerr" in body:
        return False, f"{name} must not write directly to std::cerr"
    if "warning:" in body:
        return False, f"{name} must not hard-code the warning: prefix"
    return True, f"{name} uses LOG_WARNING()."


def install_reference_tests(script_dir: Path, workdir: Path) -> None:
    source = script_dir / "reference" / "test"
    target = workdir / "test"
    shutil.copytree(source, target, dirs_exist_ok=True)
    for script in target.glob("*.sh"):
        script.chmod(0o755)


def copy_repo(source: Path, target: Path) -> None:
    def ignore(_: str, names: list[str]) -> set[str]:
        return {name for name in names if name in {"build", ".DS_Store"}}

    shutil.copytree(source, target, ignore=ignore)


def function_body(source: str, name: str) -> str:
    match = re.search(rf"\b{re.escape(name)}\s*\([^)]*\)\s*(?:->\s*[^{{]+)?\{{", source)
    if not match:
        raise ValueError(f"Could not find function {name}")

    index = match.end() - 1
    depth = 0
    for cursor in range(index, len(source)):
        char = source[cursor]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[index + 1 : cursor]
    raise ValueError(f"Could not parse function body for {name}")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def run(command: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


def command_details(prefix: str, result: subprocess.CompletedProcess[str]) -> str:
    output = "\n".join(part for part in [result.stdout.strip(), result.stderr.strip()] if part)
    return f"{prefix}: {output}" if output else prefix


if __name__ == "__main__":
    raise SystemExit(main())
