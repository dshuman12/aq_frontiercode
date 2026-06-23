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
    ".npm-cache",
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
            "create_job_address_contract",
            "patch_specific",
            True,
            0.25,
            "command",
            check_create_job_address_contract,
        ),
        Criterion(
            "update_job_address_contract",
            "patch_specific",
            True,
            0.25,
            "command",
            check_update_job_address_contract,
        ),
        Criterion(
            "job_site_route_contract",
            "patch_specific",
            True,
            0.10,
            "command",
            check_job_site_route_contract,
        ),
        Criterion(
            "submitted_job_site_tests_present",
            "regular",
            True,
            0.10,
            "command",
            check_submitted_job_site_tests_present,
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
                    float(item.get("weight", 0.025)),
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


def check_create_job_address_contract(repo: Path, _: Path, spec: dict) -> tuple[bool, str]:
    text = read_repo_text(repo, "src/controllers/jobSite.ts")
    create_block = function_block(text, "create")
    checks = {
        "requires locationId": "missingParams.push('locationId')" in create_block,
        "requires name": "missingParams.push('name')" in create_block,
        "does not require customerId input": "missingParams.push('customerId')" not in create_block,
        "allows address-only create": "Either location or address is required" in create_block
        and "!address" in create_block,
        "loads subdivision by locationId": "JobLocation.findById(locationId" in create_block,
        "rejects duplicate name within subdivision": "JobSite.findOne({ name, locationId" in compact(create_block),
        "creates address and locationId": "JobSite.create" in create_block
        and "address" in create_block
        and "locationId" in create_block,
        "pushes new site onto subdivision": "JobLocation.findByIdAndUpdate(locationId" in create_block
        and "$push" in create_block
        and "jobSites" in create_block,
    }
    return summarize_checks("create job address contract", checks, spec)


def check_update_job_address_contract(repo: Path, _: Path, spec: dict) -> tuple[bool, str]:
    text = read_repo_text(repo, "src/controllers/jobSite.ts")
    update_block = function_block(text, "update")
    normalized = compact(update_block)
    checks = {
        "loads current job site": "JobSite.findById(id" in update_block,
        "checks duplicate only when name changes": "if (name && name !== jobSite.name)" in update_block,
        "duplicate check is scoped to subdivision": "JobSite.findOne({ name, locationId" in normalized,
        "preserves address when omitted": "address ?? jobSite.address" in update_block,
        "preserves location when omitted": ": jobSite.location" in update_block,
        "preserves customer owner": "customerId: jobSite.customerId" in update_block,
        "preserves or updates homeowner": "params.homeOwner ?? jobSite.homeOwner" in update_block,
        "reports no-op updates": "No changes were made to the Job Address" in update_block,
    }
    return summarize_checks("update job address contract", checks, spec)


def check_job_site_route_contract(repo: Path, _: Path, spec: dict) -> tuple[bool, str]:
    text = read_repo_text(repo, "src/routes/jobSite.ts")
    checks = {
        "route imports create/update/get only": "search" not in text.split("from '../controllers/jobSite'")[0],
        "name search route removed": "router.get('/name'" not in text and 'router.get("/name"' not in text,
        "create route remains registered": "router.post" in text and "create" in text,
        "update route remains registered": "router.put" in text and "update" in text,
    }
    return summarize_checks("job site route contract", checks, spec)


def check_submitted_job_site_tests_present(repo: Path, _: Path, spec: dict) -> tuple[bool, str]:
    path = repo / "src/tests/controllers/jobSite.test.ts"
    if not path.exists():
        return False, "src/tests/controllers/jobSite.test.ts is missing."
    text = path.read_text(encoding="utf-8", errors="ignore")
    checks = {
        "covers create controller": "describe('create'" in text or 'describe("create"' in text,
        "covers update controller": "describe('update'" in text or 'describe("update"' in text,
        "covers missing address/location": "Either location or address is required" in text,
        "covers duplicate job address name": "already exists" in text and "findOne" in text,
        "uses model stubs": "sinon.stub(JobSite" in text and "sinon.stub(JobLocation" in text,
    }
    return summarize_checks("submitted jobSite controller tests", checks, spec)


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
    return True, "Changed files stay within the job address scope: " + ", ".join(changed[:20])


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


def summarize_checks(label: str, checks: dict[str, bool], spec: dict) -> tuple[bool, str]:
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        return False, f"{label} failed: " + "; ".join(failed)
    return True, f"{label} satisfied {len(checks)} static checks."


def read_repo_text(repo: Path, rel: str) -> str:
    path = repo / rel
    if not path.exists():
        raise FileNotFoundError(rel)
    return path.read_text(encoding="utf-8", errors="ignore")


def function_block(text: str, name: str) -> str:
    match = re.search(rf"export const {re.escape(name)}\s*=\s*async\s*\([^)]*\)\s*=>\s*{{", text)
    if not match:
        match = re.search(rf"export const {re.escape(name)}\s*=\s*\([^)]*\)\s*=>\s*{{", text)
    if not match:
        return ""
    index = match.end() - 1
    depth = 0
    for pos in range(index, len(text)):
        char = text[pos]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[match.start():pos + 1]
    return text[match.start():]


def compact(value: str) -> str:
    return re.sub(r"\s+", " ", value)


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


if __name__ == "__main__":
    raise SystemExit(main())
