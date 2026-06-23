#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


SKIP_DIRS = {".git", ".hg", ".mypy_cache", ".pytest_cache", ".ruff_cache", ".svn", ".tox", ".venv", "__pycache__", "build", "dist", "venv"}
SKIP_FILES = {".DS_Store"}


@dataclass(frozen=True)
class Criterion:
    id: str
    category: str
    blocker: bool
    weight: float
    method: str
    check: Callable[[Path, Path, dict], tuple[bool, str]]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo", nargs="?", default=None)
    parser.add_argument("--criterion")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    spec = json.loads((script_dir / "task_spec.json").read_text(encoding="utf-8"))
    repo = (Path(args.repo) if args.repo else script_dir.parents[1] / "environment" / "repo").resolve()
    selected = [item for item in criteria() if args.criterion in {None, item.id}]
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


def criteria() -> list[Criterion]:
    return [
        Criterion("hidden_auth_tests_pass", "patch_specific", True, 0.45, "classical", check_hidden_auth_tests_pass),
        Criterion("visible_regression_tests_pass", "regular", True, 0.20, "command", check_visible_regression_tests_pass),
        Criterion("scope_matches_auth_area", "regular", True, 0.15, "scope", check_scope_matches_auth_area),
        Criterion("no_hidden_asset_leak", "regular", True, 0.05, "command", check_no_hidden_asset_leak),
        Criterion("code_quality_maintainable", "regular", False, 0.15, "llm_prompt", check_quality_placeholder),
    ]


def evaluate_criterion(item: Criterion, repo: Path, script_dir: Path, spec: dict) -> dict:
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
    total_weight = sum(float(item["weight"]) for item in results)
    score = sum(float(item["score"]) * float(item["weight"]) for item in results) / total_weight
    return {
        "task_id": spec["task_id"],
        "submission_id": "",
        "pass": not blocker_failures,
        "score": score,
        "reward": 1.0 if not blocker_failures else 0.0,
        "blocker_failures": blocker_failures,
        "criteria_results": results,
        "metadata": {
            "criteria_passed": sum(1 for item in results if item["passed"]),
            "criteria_total": len(results),
        },
    }


def check_hidden_auth_tests_pass(repo: Path, script_dir: Path, spec: dict) -> tuple[bool, str]:
    with tempfile.TemporaryDirectory(prefix="vaultkey-hidden-auth-") as tmp:
        workdir = Path(tmp) / "repo"
        copy_repo(repo, workdir)
        overlay_reference_tests(script_dir, workdir, spec["reference_test_files"])
        return run_visible_command(workdir, spec, "hidden auth tests")


def check_visible_regression_tests_pass(repo: Path, _: Path, spec: dict) -> tuple[bool, str]:
    with tempfile.TemporaryDirectory(prefix="vaultkey-visible-") as tmp:
        workdir = Path(tmp) / "repo"
        copy_repo(repo, workdir)
        return run_visible_command(workdir, spec, "visible regression tests")


def check_scope_matches_auth_area(repo: Path, script_dir: Path, spec: dict) -> tuple[bool, str]:
    changed = changed_files(script_dir / "base_repo", repo)
    allowed_paths = set(spec.get("allowed_changed_paths", []))
    allowed_prefixes = tuple(spec.get("allowed_changed_prefixes", []))
    unexpected = [
        path for path in changed
        if path not in allowed_paths and not any(path.startswith(prefix) for prefix in allowed_prefixes)
    ]
    if unexpected:
        return False, "Unexpected changed files: " + ", ".join(unexpected[:20])
    max_files = int(spec.get("max_changed_files", 8))
    if len(changed) > max_files:
        return False, f"Too many changed files: {len(changed)} > {max_files}"
    if changed_line_count(script_dir / "base_repo", repo) > int(spec.get("max_changed_lines", 1400)):
        return False, "Changed-line count exceeds task scope limit"
    if not changed:
        return False, "No files changed relative to the base snapshot"
    return True, "Changed files stay within auth task scope: " + ", ".join(changed)


def check_no_hidden_asset_leak(repo: Path, _: Path, spec: dict) -> tuple[bool, str]:
    forbidden_names = {"task_spec.json", "reference.patch", "reference_tests", "frontiercode.yaml"}
    fix_commit = str(spec.get("fix_commit", ""))
    leaks: list[str] = []
    for path in iter_files(repo):
        rel = path.relative_to(repo).as_posix()
        if set(rel.split("/")) & forbidden_names:
            leaks.append(rel)
            continue
        if fix_commit and path.stat().st_size <= 200_000:
            text = path.read_text(encoding="utf-8", errors="ignore")
            if fix_commit in text:
                leaks.append(rel)
    if leaks:
        return False, "Agent-visible repo appears to contain hidden material: " + ", ".join(leaks[:20])
    return True, "No hidden grader asset names or fix commit identifiers were found in the agent-visible repo"


def check_quality_placeholder(_: Path, __: Path, ___: dict) -> tuple[bool, str]:
    return True, "Non-blocking quality criterion is evaluated by task QA review."


def run_visible_command(workdir: Path, spec: dict, label: str) -> tuple[bool, str]:
    command = str(spec["visible_test_command"])
    result = run_shell(command, workdir)
    details = command_details(label, command, result)
    if result.returncode == 0:
        return True, details
    combined = (result.stdout or "") + (result.stderr or "")
    if "No module named pytest" in combined and shutil.which("uv"):
        fallback = "uv run --no-project --with pytest python -m pytest tests/ -q"
        fallback_result = run_shell(fallback, workdir)
        fallback_details = details + "\n\nFallback:\n" + command_details(label, fallback, fallback_result)
        return fallback_result.returncode == 0, fallback_details
    return False, details


def run_shell(command: str, cwd: Path) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONPATH"] = "src" if not env.get("PYTHONPATH") else "src" + os.pathsep + env["PYTHONPATH"]
    env.setdefault("UV_CACHE_DIR", "/tmp/frontiercode_uv_cache")
    try:
        return subprocess.run(
            command,
            cwd=cwd,
            env=env,
            shell=True,
            text=True,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=120,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        return subprocess.CompletedProcess(
            command,
            124,
            stdout=decode_timeout(exc.stdout),
            stderr=f"Command timed out after {exc.timeout}s\n" + decode_timeout(exc.stderr),
        )


def overlay_reference_tests(script_dir: Path, workdir: Path, reference_files: list[str]) -> None:
    source_root = script_dir / "reference_tests"
    for rel in reference_files:
        source = source_root / rel
        target = workdir / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def copy_repo(source: Path, target: Path) -> None:
    shutil.copytree(source, target, ignore=repo_ignore)


def repo_ignore(dirpath: str, names: list[str]) -> set[str]:
    skipped: set[str] = set()
    for name in names:
        path = Path(dirpath) / name
        if path.is_dir() and name in SKIP_DIRS:
            skipped.add(name)
        elif path.is_file() and (name in SKIP_FILES or name.endswith(".pyc")):
            skipped.add(name)
    return skipped


def changed_files(base_repo: Path, repo: Path) -> list[str]:
    base_hashes = file_hashes(base_repo)
    current_hashes = file_hashes(repo)
    changed = [rel for rel, digest in current_hashes.items() if base_hashes.get(rel) != digest]
    changed.extend(rel for rel in base_hashes if rel not in current_hashes)
    return sorted(set(changed))


def changed_line_count(base_repo: Path, repo: Path) -> int:
    try:
        result = subprocess.run(
            ["git", "diff", "--no-index", "--numstat", str(base_repo), str(repo)],
            text=True,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=60,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return 0
    total = 0
    for line in result.stdout.splitlines():
        added, deleted, *_ = line.split("\t")
        if added != "-":
            total += int(added)
        if deleted != "-":
            total += int(deleted)
    return total


def file_hashes(root: Path) -> dict[str, str]:
    return {path.relative_to(root).as_posix(): sha256_file(path) for path in iter_files(root)}


def iter_files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIRS]
        for filename in filenames:
            if filename in SKIP_FILES or filename.endswith(".pyc"):
                continue
            path = Path(dirpath) / filename
            if path.is_file():
                yield path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_result_files(result_doc: dict, repo: Path, script_dir: Path) -> None:
    log_dir = verifier_log_dir(repo)
    log_dir.mkdir(parents=True, exist_ok=True)
    (log_dir / "frontiercode_result.json").write_text(json.dumps(result_doc, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (log_dir / "reward.json").write_text(json.dumps({"reward": result_doc["reward"]}, sort_keys=True) + "\n", encoding="utf-8")
    (log_dir / "submission.patch").write_text(render_tree_diff(script_dir / "base_repo", repo), encoding="utf-8")


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


def render_tree_diff(base_repo: Path, repo: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "diff", "--no-index", "--binary", str(base_repo), str(repo)],
            text=True,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=60,
            check=False,
        )
        return result.stdout
    except (OSError, subprocess.TimeoutExpired):
        return "Changed files:\n" + "\n".join(changed_files(base_repo, repo)) + "\n"


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


def decode_timeout(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


if __name__ == "__main__":
    raise SystemExit(main())

