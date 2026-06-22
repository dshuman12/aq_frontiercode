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


TASK_ID = "jsonschema__log-warning-helper-blog-example"
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
            "resolver_custom_resolver_uses_log_warning",
            "patch_specific",
            "src/resolver.h uses LOG_WARNING for the multi-line CustomResolver warning.",
            check_resolver_custom_resolver,
        ),
        Criterion(
            "command_bundle_without_id_uses_log_warning",
            "patch_specific",
            'src/command_bundle.cc uses LOG_WARNING inside options.contains("without-id").',
            check_command_bundle_without_id,
        ),
        Criterion(
            "log_warning_function_contract",
            "patch_specific",
            "src/logger.h defines auto LOG_WARNING() -> std::ostream & and pre-prints warning: to stderr.",
            check_log_warning_function_contract,
        ),
        Criterion(
            "command_lint_disable_lint_rules_uses_log_warning",
            "patch_specific",
            "src/command_lint.cc uses LOG_WARNING in disable_lint_rules.",
            check_command_lint_disable_lint_rules,
        ),
        Criterion(
            "command_validate_schema_template_uses_log_warning",
            "patch_specific",
            "src/command_validate.cc uses LOG_WARNING in get_schema_template.",
            check_command_validate_schema_template,
        ),
        Criterion(
            "command_validate_empty_jsonl_uses_log_warning",
            "patch_specific",
            "src/command_validate.cc uses LOG_WARNING for the JSONL file is empty warning.",
            check_command_validate_empty_jsonl,
        ),
        Criterion(
            "project_builds_cleanly",
            "regular",
            "make clean and make configure compile pass.",
            check_project_builds_cleanly,
        ),
        Criterion(
            "clang_format_test_clean",
            "regular",
            "make clang_format_test passes.",
            check_clang_format_test_clean,
        ),
        Criterion(
            "reference_tests_pass",
            "regular",
            "Hidden reference test/CMakeLists.txt and test/*.sh pass with make.",
            check_reference_tests_pass,
        ),
        Criterion(
            "reference_tests_fail_on_base",
            "regular",
            "Hidden reference tests fail after restoring everything except the reference tests to base.",
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


def check_resolver_custom_resolver(repo: Path, _: Path) -> tuple[bool, str]:
    body = function_body(read_text(repo / "src" / "resolver.h"), "CustomResolver")
    return check_multi_line_warning_body(body, "CustomResolver constructor")


def check_command_bundle_without_id(repo: Path, _: Path) -> tuple[bool, str]:
    source = read_text(repo / "src" / "command_bundle.cc")
    body = conditional_body(source, r'options\.contains\s*\(\s*"without-id"\s*\)')
    return check_multi_line_warning_body(body, 'options.contains("without-id") conditional')


def check_log_warning_function_contract(repo: Path, _: Path) -> tuple[bool, str]:
    logger = read_text(repo / "src" / "logger.h")
    signature = r"auto\s+LOG_WARNING\s*\(\s*\)\s*->\s*std::ostream\s*&"
    if not re.search(signature, logger):
        return False, "src/logger.h must define auto LOG_WARNING() -> std::ostream & with no arguments."
    if re.search(r"auto\s+LOG_WARNING\s*\([^)]*[A-Za-z_][^)]*\)", logger):
        return False, "LOG_WARNING must take no arguments."
    body = function_body(logger, "LOG_WARNING")
    if "std::cerr" not in body:
        return False, "LOG_WARNING must return the standard error stream."
    if "warning:" not in body:
        return False, "LOG_WARNING must pre-print the warning: prefix."
    if "LOG_VERBOSE" in body or "null_stream" in body:
        return False, "LOG_WARNING must not depend on verbose logging or the null stream."
    return True, "LOG_WARNING has the required no-argument stderr prefix contract."


def check_command_lint_disable_lint_rules(repo: Path, _: Path) -> tuple[bool, str]:
    body = function_body(read_text(repo / "src" / "command_lint.cc"), "disable_lint_rules")
    return check_single_warning_body(body, "disable_lint_rules")


def check_command_validate_schema_template(repo: Path, _: Path) -> tuple[bool, str]:
    body = function_body(read_text(repo / "src" / "command_validate.cc"), "get_schema_template")
    return check_single_warning_body(body, "get_schema_template")


def check_command_validate_empty_jsonl(repo: Path, _: Path) -> tuple[bool, str]:
    body = function_body(read_text(repo / "src" / "command_validate.cc"), "warn_empty_jsonl")
    return check_single_warning_body(body, "warn_empty_jsonl")


def check_project_builds_cleanly(repo: Path, _: Path) -> tuple[bool, str]:
    clean = run(["make", "clean"], repo)
    if clean.returncode != 0:
        return False, command_details("make clean failed", clean)
    compile_result = run(["make", "configure", "compile"], repo)
    if compile_result.returncode != 0:
        return False, command_details("make configure compile failed", compile_result)
    return True, "make clean and make configure compile passed."


def check_clang_format_test_clean(repo: Path, _: Path) -> tuple[bool, str]:
    result = run(["make", "clang_format_test"], repo)
    if result.returncode != 0:
        return False, command_details("make clang_format_test failed", result)
    return True, "make clang_format_test passed."


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
        return False, f"{name} must call LOG_WARNING()."
    if "LOG_VERBOSE()" in body:
        return False, f"{name} must not use LOG_VERBOSE()."
    if "std::cerr" in body:
        return False, f"{name} must not write directly to std::cerr."
    if "warning:" in body:
        return False, f"{name} must not hard-code the warning: prefix."
    return True, f"{name} uses LOG_WARNING()."


def check_multi_line_warning_body(body: str, name: str) -> tuple[bool, str]:
    if body.count("LOG_WARNING()") != 1:
        return False, f"{name} must use one chained LOG_WARNING() expression."
    if "LOG_VERBOSE()" in body:
        return False, f"{name} must not use LOG_VERBOSE()."
    if "std::cerr" in body:
        return False, f"{name} must not write directly to std::cerr for continuation lines."
    if "warning:" in body:
        return False, f"{name} must not hard-code the warning: prefix."
    return True, f"{name} uses one chained LOG_WARNING() expression."


def install_reference_tests(script_dir: Path, workdir: Path) -> None:
    source = script_dir / "reference" / "test"
    target = workdir / "test"
    shutil.copytree(source, target, dirs_exist_ok=True)
    for script in target.glob("*.sh"):
        script.chmod(0o755)


def copy_repo(source: Path, target: Path) -> None:
    def ignore(_: str, names: list[str]) -> set[str]:
        return {name for name in names if name in {"build", ".DS_Store", "verifier-logs"}}

    shutil.copytree(source, target, ignore=ignore)


def function_body(source: str, name: str) -> str:
    match = re.search(
        rf"\b{re.escape(name)}\s*\([^)]*\)\s*(?:->\s*[^{{:]+)?(?:\s*:\s*[^{{]+)?\{{",
        source,
    )
    if not match:
        raise ValueError(f"Could not find function {name}")
    return brace_body(source, match.end() - 1)


def conditional_body(source: str, condition_pattern: str) -> str:
    match = re.search(rf"if\s*\([^)]*{condition_pattern}[^)]*\)\s*\{{", source)
    if not match:
        raise ValueError(f"Could not find conditional matching {condition_pattern}")
    return brace_body(source, match.end() - 1)


def brace_body(source: str, open_brace_index: int) -> str:
    depth = 0
    for cursor in range(open_brace_index, len(source)):
        char = source[cursor]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[open_brace_index + 1 : cursor]
    raise ValueError("Could not parse braced body")


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
