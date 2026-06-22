#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


SKIP_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".tox",
    ".venv",
    "__pycache__",
    "build",
    "dist",
    "node_modules",
    "venv",
}
SKIP_FILES = {".DS_Store"}
SKIP_FILE_SUFFIXES = (".log", ".pyc")
SKIP_PATH_PREFIXES = ("dist/", "frontend/dist/", "server/logs/")
TEST_PATH_RE = re.compile(
    r"(^|/)(__tests__|tests?|specs?)(/|$)|"
    r"(^|/)(test_[^/]+|[^/]+_(test|spec)|[^/]+\.(test|spec))\.[A-Za-z0-9]+$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Criterion:
    id: str
    category: str
    blocker: bool
    weight: float
    method: str
    check: Callable[[Path, Path, dict], tuple[bool, str]] | None
    placeholder_details: str = ""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo", nargs="?", default=None)
    parser.add_argument("--criterion")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    spec = json.loads((script_dir / "task_spec.json").read_text(encoding="utf-8"))
    repo = (Path(args.repo) if args.repo else script_dir.parents[1] / "environment" / "repo").resolve()
    selected = [item for item in criteria(spec) if args.criterion in {None, item.id}]
    if args.criterion and not selected:
        parser.error(f"unknown criterion: {args.criterion}")

    results = [evaluate_criterion(item, repo, script_dir, spec) for item in selected]
    if args.criterion:
        result = results[0]
        print(result["details"])
        return 0 if result["passed"] else 1

    result_doc = build_result_doc(spec, results)
    write_result_files(result_doc, repo, script_dir)
    return 0 if result_doc["pass"] else 1


def criteria(spec: dict | None = None) -> list[Criterion]:
    items = [
        Criterion(
            "hidden_reference_tests_pass",
            "patch_specific",
            True,
            0.35,
            "classical",
            check_hidden_reference_tests_pass,
        ),
        Criterion(
            "submitted_tests_fail_on_base",
            "regular",
            True,
            0.15,
            "reverse_classical",
            check_submitted_tests_fail_on_base,
        ),
        Criterion(
            "visible_regression_tests_pass",
            "regular",
            True,
            0.20,
            "command",
            check_visible_regression_tests_pass,
        ),
        Criterion(
            "scope_matches_reference_intent",
            "regular",
            True,
            0.15,
            "scope",
            check_scope_matches_reference_intent,
        ),
        Criterion(
            "no_hidden_asset_leak",
            "regular",
            True,
            0.05,
            "command",
            check_no_hidden_asset_leak,
        ),
    ]
    if spec:
        for item in spec.get("advisory_rubric_items", []):
            if not isinstance(item, dict) or not item.get("id"):
                continue
            items.append(
                Criterion(
                    str(item["id"]),
                    str(item.get("category", "regular")),
                    False,
                    float(item.get("weight", 0.02)),
                    "llm_prompt",
                    None,
                    "Advisory LLM rubric item recorded by the deterministic verifier; "
                    "run task QA with LLM review for semantic scoring.",
                )
            )
    return items


def evaluate_criterion(item: Criterion, repo: Path, script_dir: Path, spec: dict) -> dict:
    if item.check is None:
        passed = True
        details = item.placeholder_details
    else:
        try:
            passed, details = item.check(repo, script_dir, spec)
        except Exception as exc:
            passed = False
            details = f"{type(exc).__name__}: {exc}"
    return {
        "criterion_id": item.id,
        "passed": passed,
        "score": 1.0 if passed else 0.0,
        "blocker": item.blocker,
        "weight": item.weight,
        "details": details,
        "method": item.method,
        "category": item.category,
    }


def build_result_doc(spec: dict, results: list[dict]) -> dict:
    blocker_failures = [item["criterion_id"] for item in results if item["blocker"] and not item["passed"]]
    passed = not blocker_failures
    score_total = sum(item["weight"] for item in results)
    score = (
        sum(item["score"] * item["weight"] for item in results) / score_total
        if score_total
        else 0.0
    )
    category_counts: dict[str, dict[str, int]] = {}
    for result in results:
        counts = category_counts.setdefault(result["category"], {"passed": 0, "total": 0})
        counts["total"] += 1
        if result["passed"]:
            counts["passed"] += 1
    return {
        "task_id": spec["task_id"],
        "submission_id": "",
        "pass": passed,
        "score": score,
        "reward": 1.0 if passed else 0.0,
        "blocker_failures": blocker_failures,
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


def check_hidden_reference_tests_pass(repo: Path, script_dir: Path, spec: dict) -> tuple[bool, str]:
    reference_files = spec.get("reference_test_files", [])
    if not reference_files:
        return False, "No reference test files were extracted from the fix commit."
    with tempfile.TemporaryDirectory(prefix="frontiercode-hidden-tests-") as tmp:
        workdir = Path(tmp) / "repo"
        copy_repo(repo, workdir)
        overlay_reference_tests(script_dir, workdir, reference_files)
        return run_visible_command(workdir, spec, "hidden reference tests")


def check_submitted_tests_fail_on_base(repo: Path, script_dir: Path, spec: dict) -> tuple[bool, str]:
    base_repo = script_dir / "base_repo"
    submitted_tests = [
        rel for rel in changed_files(base_repo, repo)
        if is_test_path(rel) and (repo / rel).exists()
    ]
    if not submitted_tests:
        return False, "No submitted visible test changes were found to replay against the base snapshot."
    with tempfile.TemporaryDirectory(prefix="frontiercode-reverse-classical-") as tmp:
        workdir = Path(tmp) / "repo"
        copy_repo(base_repo, workdir)
        for rel in submitted_tests:
            target = workdir / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(repo / rel, target)
        visible_passed, details = run_visible_command(
            workdir,
            spec,
            "submitted tests on base snapshot",
        )
    if visible_passed:
        return False, "Submitted tests unexpectedly passed on the broken base snapshot.\n" + details
    return True, "Submitted tests failed on the broken base snapshot as expected.\n" + details


def check_visible_regression_tests_pass(repo: Path, _: Path, spec: dict) -> tuple[bool, str]:
    with tempfile.TemporaryDirectory(prefix="frontiercode-visible-tests-") as tmp:
        workdir = Path(tmp) / "repo"
        copy_repo(repo, workdir)
        return run_visible_command(workdir, spec, "visible regression command")


def check_scope_matches_reference_intent(repo: Path, script_dir: Path, spec: dict) -> tuple[bool, str]:
    base_repo = script_dir / "base_repo"
    changed = changed_files(base_repo, repo)
    allowed = set(spec.get("allowed_changed_paths", []))
    allowed_prefixes = tuple(spec.get("allowed_changed_prefixes", []))
    unexpected = [
        path for path in changed
        if path not in allowed and not any(path.startswith(prefix) for prefix in allowed_prefixes)
    ]
    max_changed_files = int(spec.get("max_changed_files", max(1, len(allowed) + 3)))
    if unexpected:
        return False, "Unexpected changed files: " + ", ".join(unexpected[:20])
    if len(changed) > max_changed_files:
        return False, f"Too many changed files: {len(changed)} > {max_changed_files}"
    if not changed:
        return False, "No files changed relative to the hidden base snapshot."
    return True, "Changed files stay within the generated reference scope: " + ", ".join(changed[:20])


def check_no_hidden_asset_leak(repo: Path, _: Path, spec: dict) -> tuple[bool, str]:
    forbidden_names = {"task_spec.json", "reference.patch", "reference_tests", "frontiercode.yaml"}
    fix_commit = str(spec.get("fix_commit", ""))
    leaks: list[str] = []
    for path in iter_files(repo):
        rel = path.relative_to(repo).as_posix()
        parts = set(rel.split("/"))
        if parts & forbidden_names:
            leaks.append(rel)
            continue
        if fix_commit and path.stat().st_size <= 200_000:
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            if fix_commit in text:
                leaks.append(rel)
    if leaks:
        return False, "Agent-visible repo appears to contain hidden grader material: " + ", ".join(leaks[:20])
    return True, "No generated hidden asset names or fix commit identifiers were found in the agent-visible repo."


def is_test_path(path: str) -> bool:
    return bool(TEST_PATH_RE.search(path))


def run_visible_command(workdir: Path, spec: dict, label: str) -> tuple[bool, str]:
    command = str(spec.get("visible_test_command", "")).strip()
    if not command:
        return False, "No visible test command was generated."
    env = os.environ.copy()
    env.setdefault("CI", "1")
    npm_home = Path(tempfile.gettempdir()) / "frontiercode-npm-home"
    npm_cache = Path(tempfile.gettempdir()) / "frontiercode-npm-cache"
    npm_logs = Path(tempfile.gettempdir()) / "frontiercode-npm-logs"
    npm_home.mkdir(parents=True, exist_ok=True)
    npm_cache.mkdir(parents=True, exist_ok=True)
    npm_logs.mkdir(parents=True, exist_ok=True)
    env["HOME"] = str(npm_home)
    env.setdefault("NPM_CONFIG_CACHE", str(npm_cache))
    env.setdefault("NPM_CONFIG_LOGS_DIR", str(npm_logs))
    try:
        result = subprocess.run(
            command,
            cwd=workdir,
            env=env,
            shell=True,
            text=True,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=int(spec.get("test_timeout_seconds", 600)),
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        stdout = decode_timeout_output(exc.stdout)
        stderr = decode_timeout_output(exc.stderr)
        return False, f"{label} timed out after {exc.timeout}s\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}"
    details = command_details(label, command, result)
    return result.returncode == 0, details


def overlay_reference_tests(script_dir: Path, workdir: Path, reference_files: list[str]) -> None:
    source_root = script_dir / "reference_tests"
    for rel in reference_files:
        source = source_root / rel
        target = workdir / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def copy_repo(source: Path, target: Path) -> None:
    shutil.copytree(
        source,
        target,
        ignore=repo_ignore(source),
        dirs_exist_ok=False,
    )


def repo_ignore(source: Path):
    root = source.resolve()

    def ignore(dirpath: str, names: list[str]) -> set[str]:
        skipped: set[str] = set()
        for name in names:
            path = Path(dirpath) / name
            if path.is_dir() and name in SKIP_DIRS:
                skipped.add(name)
                continue
            if not path.is_file():
                continue
            rel = path.resolve().relative_to(root).as_posix()
            if (
                name in SKIP_FILES
                or rel.endswith(SKIP_FILE_SUFFIXES)
                or any(rel.startswith(prefix) for prefix in SKIP_PATH_PREFIXES)
            ):
                skipped.add(name)
        return skipped

    return ignore


def changed_files(base_repo: Path, repo: Path) -> list[str]:
    base_hashes = file_hashes(base_repo)
    current_hashes = file_hashes(repo)
    changed = []
    for rel, digest in current_hashes.items():
        if base_hashes.get(rel) != digest:
            changed.append(rel)
    for rel in base_hashes:
        if rel not in current_hashes:
            changed.append(rel)
    return sorted(set(changed))


def file_hashes(root: Path) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): sha256_file(path)
        for path in iter_files(root)
    }


def iter_files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIRS]
        for filename in filenames:
            path = Path(dirpath) / filename
            rel = path.relative_to(root).as_posix()
            if should_skip_file(rel):
                continue
            if path.is_file():
                yield path


def should_skip_file(rel: str) -> bool:
    name = Path(rel).name
    return (
        name in SKIP_FILES
        or rel.endswith(SKIP_FILE_SUFFIXES)
        or any(rel.startswith(prefix) for prefix in SKIP_PATH_PREFIXES)
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def render_submission_patch(base_repo: Path, repo: Path) -> str:
    with tempfile.TemporaryDirectory(prefix="frontiercode-filtered-diff-") as tmp:
        tmp_path = Path(tmp)
        base_copy = tmp_path / "base"
        repo_copy = tmp_path / "repo"
        copy_filtered_tree(base_repo, base_copy)
        copy_filtered_tree(repo, repo_copy)
        return render_tree_diff(base_copy, repo_copy)


def copy_filtered_tree(source: Path, target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)
    for path in iter_files(source):
        rel = path.relative_to(source)
        dest = target / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)


def render_tree_diff(base_repo: Path, repo: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "diff", "--no-index", "--binary", "base", "repo"],
            text=True,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=base_repo.parent,
            timeout=60,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return "Changed files:\n" + "\n".join(changed_files(base_repo, repo)) + "\n"
    return result.stdout or ("Changed files:\n" + "\n".join(changed_files(base_repo, repo)) + "\n")


def command_details(label: str, command: str, result: subprocess.CompletedProcess[str]) -> str:
    return (
        f"{label}: `{command}` exited {result.returncode}\n"
        f"STDOUT:\n{trim(result.stdout)}\n"
        f"STDERR:\n{trim(result.stderr)}"
    )


def trim(value: str, limit: int = 6000) -> str:
    if len(value) <= limit:
        return value
    return value[:limit].rstrip() + "\n...<truncated>..."


def decode_timeout_output(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


if __name__ == "__main__":
    raise SystemExit(main())
