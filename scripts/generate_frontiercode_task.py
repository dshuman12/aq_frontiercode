#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import threading
import time
import textwrap
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


REQUIRED_COLUMNS = (
    "Repository",
    "Task ID",
    "Bug / Task Description",
    "Fix Commit",
    "Base Commit",
    "Source Archive",
    "Archive Repo Root",
    "Commit Subject",
    "Visible Test Command Guess",
)

TEST_PATH_RE = re.compile(
    r"(^|/)(__tests__|tests?|specs?)(/|$)|"
    r"(^|/)(test_[^/]+|[^/]+_(test|spec)|[^/]+\.(test|spec))\.[A-Za-z0-9]+$",
    re.IGNORECASE,
)

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
DEFAULT_INSTRUCTION_MODEL = "anthropic/opus-4.8"
DEFAULT_BASE_URL = "https://api.aqinference.com/v1"
LEGACY_BASE_URL = "https://inference.afterquery.com/v1"
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)
DEFAULT_INSTRUCTION_CONTEXT_CHARS = 80_000
SOURCE_CONTEXT_EXTENSIONS = (
    ".go", ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".rb", ".rs",
    ".c", ".cc", ".cpp", ".h", ".hpp", ".cs", ".kt", ".swift", ".scala", ".php",
)
INSTRUCTION_GENERATION_ATTEMPTS = 2
PROGRESS_INTERVAL_SECONDS = 5.0
QA_STATUS_CSV_FIELDS = (
    "Task ID",
    "Repository",
    "Data Row",
    "Sheet Row",
    "QA Status",
    "QA Stage",
    "QA Updated At",
    "QA Details",
    "Generated Task Path",
    "QA Report Path",
)
ADVISORY_RUBRIC_ITEM_TEMPLATES = (
    {
        "id": "behavior_core_requirement",
        "category": "patch_specific",
        "weight": 0.02,
        "description": "The submitted patch satisfies the central maintainer request, not just the narrow visible test command.",
        "prompt": "Score whether the diff fully resolves this task for {repository}: {task_description}",
    },
    {
        "id": "behavior_edge_cases",
        "category": "patch_specific",
        "weight": 0.02,
        "description": "The implementation handles edge cases naturally implied by the task and affected code paths.",
        "prompt": "Score whether the diff handles realistic edge cases around {affected_source_paths} while preserving the requested behavior.",
    },
    {
        "id": "behavior_error_handling",
        "category": "patch_specific",
        "weight": 0.02,
        "description": "The change preserves or improves existing error handling instead of masking failures.",
        "prompt": "Score whether the diff keeps failure modes explicit and maintainable for the task behavior in {repository}.",
    },
    {
        "id": "behavior_backward_compatibility",
        "category": "regular",
        "weight": 0.02,
        "description": "Existing public behavior and compatibility constraints remain intact outside the requested fix.",
        "prompt": "Score whether the diff avoids breaking existing documented behavior, public APIs, file formats, or command-line contracts.",
    },
    {
        "id": "regression_visible_tests_meaningful",
        "category": "regular",
        "weight": 0.02,
        "description": "Visible regression tests exercise the requested behavior rather than only checking superficial execution.",
        "prompt": "Score whether the submitted tests make {visible_command} meaningfully validate the requested behavior.",
    },
    {
        "id": "regression_reference_area_preserved",
        "category": "patch_specific",
        "weight": 0.02,
        "description": "The fix covers behavior in the same functional area as the extracted reference tests.",
        "prompt": "Score whether the diff addresses the behavior covered by these inferred test areas: {reference_test_summary}.",
    },
    {
        "id": "test_coverage_positive_path",
        "category": "regular",
        "weight": 0.02,
        "description": "Tests cover at least one successful or expected-use path for the new behavior.",
        "prompt": "Score whether the patch includes or preserves clear positive-path coverage for the requested behavior.",
    },
    {
        "id": "test_coverage_negative_path",
        "category": "regular",
        "weight": 0.02,
        "description": "Tests cover a failing, boundary, malformed, or regression-prone case when such a case is relevant.",
        "prompt": "Score whether the patch includes useful negative or boundary coverage for the task, without overfitting to implementation details.",
    },
    {
        "id": "test_integration_with_existing_workflow",
        "category": "regular",
        "weight": 0.02,
        "description": "New or edited tests are integrated into the repository's normal test workflow.",
        "prompt": "Score whether tests are wired into the existing project workflow so {visible_command} or the documented test command runs them.",
    },
    {
        "id": "scope_minimal_patch",
        "category": "regular",
        "weight": 0.02,
        "description": "The patch is focused and avoids unrelated rewrites, broad churn, or cosmetic-only edits.",
        "prompt": "Score whether the diff is appropriately scoped for the task and avoids unrelated churn outside {affected_source_paths}.",
    },
    {
        "id": "scope_no_unrelated_public_api_changes",
        "category": "regular",
        "weight": 0.02,
        "description": "The patch does not change unrelated public APIs, configuration defaults, or generated outputs.",
        "prompt": "Score whether the diff avoids unrelated public API, configuration, dependency, generated-file, or packaging changes.",
    },
    {
        "id": "maintainability_idiomatic_design",
        "category": "regular",
        "weight": 0.02,
        "description": "The implementation follows the repository's existing design style and naming conventions.",
        "prompt": "Score whether the implementation is idiomatic for {repository}, matching nearby abstractions, names, and project style.",
    },
    {
        "id": "maintainability_simple_control_flow",
        "category": "regular",
        "weight": 0.02,
        "description": "The implementation is simple to reason about and avoids unnecessary abstraction or brittle special cases.",
        "prompt": "Score whether the implementation is understandable, localized, and avoids brittle special casing.",
    },
    {
        "id": "dependency_and_environment_fit",
        "category": "regular",
        "weight": 0.02,
        "description": "The patch avoids unnecessary new dependencies and remains compatible with the generated task environment.",
        "prompt": "Score whether the diff fits the existing dependency set and can run in the task environment without extra unstated setup.",
    },
    {
        "id": "observable_output_contracts",
        "category": "patch_specific",
        "weight": 0.02,
        "description": "User-visible outputs, diagnostics, return values, or persisted data match the requested contract.",
        "prompt": "Score whether observable outputs and side effects match the requested task behavior for {repository}.",
    },
)

RUN_CRITERIA_TEMPLATE = r'''#!/usr/bin/env python3
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
'''


@dataclass(frozen=True)
class GenerationResult:
    task_id: str
    task_path: Path
    repository: str
    source_archive: Path
    base_commit: str
    fix_commit: str
    visible_command: str
    reference_test_files: tuple[str, ...]
    changed_paths: tuple[str, ...]


@dataclass(frozen=True)
class PostGenerationQAResult:
    passed: bool
    returncode: int
    failed_stage: str
    output_dir: Path
    structure_output: Path
    full_output: Path


@dataclass(frozen=True)
class QAStatusRecord:
    task_id: str
    repository: str
    data_row_number: int
    sheet_row_number: int
    status: str
    stage: str
    updated_at: str
    details: str
    task_path: str
    report_path: str

    def to_csv_row(self) -> dict[str, str]:
        return {
            "Task ID": self.task_id,
            "Repository": self.repository,
            "Data Row": str(self.data_row_number),
            "Sheet Row": str(self.sheet_row_number),
            "QA Status": self.status,
            "QA Stage": self.stage,
            "QA Updated At": self.updated_at,
            "QA Details": self.details,
            "Generated Task Path": self.task_path,
            "QA Report Path": self.report_path,
        }


class Progress:
    def __init__(self, *, enabled: bool = True) -> None:
        self.enabled = enabled
        self._lock = threading.Lock()
        self._started_at = time.monotonic()

    def step(self, message: str) -> None:
        if not self.enabled:
            return
        with self._lock:
            elapsed = time.monotonic() - self._started_at
            sys.stderr.write(f"[generate {elapsed:6.1f}s] {message}\n")
            sys.stderr.flush()

    def row(self, index: int, total: int, sheet_row: int, task_id: str, repo: str) -> None:
        self.step(f"row {index}/{total} (sheet row {sheet_row}): {task_id} [{repo}]")

    def loading(self, message: str) -> "Loading":
        return Loading(self, message)


class Loading:
    def __init__(self, progress: Progress, message: str) -> None:
        self.progress = progress
        self.message = message
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._started_at = 0.0

    def __enter__(self) -> "Loading":
        if not self.progress.enabled:
            return self
        self._started_at = time.monotonic()
        self.progress.step(f"{self.message}: started")
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001 - context manager protocol.
        if not self.progress.enabled:
            return None
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=1.0)
        elapsed = time.monotonic() - self._started_at
        status = "failed" if exc_type else "done"
        self.progress.step(f"{self.message}: {status} after {elapsed:.1f}s")
        return None

    def _run(self) -> None:
        while not self._stop.wait(PROGRESS_INTERVAL_SECONDS):
            elapsed = time.monotonic() - self._started_at
            self.progress.step(f"{self.message}: still running after {elapsed:.1f}s")


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    progress = Progress(enabled=not args.quiet)
    repo_root = args.repo_root.resolve()
    output_root = args.output_root.resolve()
    progress.step("loading rows")
    rows = list(load_rows(args))
    if not rows:
        sys.stderr.write("No task rows found.\n")
        return 1

    start_index = max(args.row_number - 1, 0)
    selected = rows[start_index : start_index + args.limit]
    if not selected:
        sys.stderr.write(f"No rows selected at row number {args.row_number}.\n")
        return 1
    progress.step(f"selected {len(selected)} row(s) from {len(rows)} available row(s)")

    results = []
    qa_failures = []
    qa_output_root = resolve_qa_output_root(args, output_root)
    status_writer = build_qa_status_writer(args, qa_output_root, progress)
    for display_index, (offset, row) in enumerate(
        zip(range(start_index + 1, start_index + 1 + len(selected)), selected),
        start=1,
    ):
        task_id = safe_task_id(row, offset)
        result: GenerationResult | None = None
        try:
            validate_row(row, offset)
            task_id = slug_task_id(row["Task ID"])
            progress.row(display_index, len(selected), offset, task_id, row["Repository"].strip())
            result = generate_task(
                row,
                repo_root,
                output_root,
                force=args.force,
                dry_run=args.dry_run,
                instruction_model=args.instruction_model,
                instruction_timeout_seconds=args.instruction_timeout_seconds,
                instruction_context_chars=args.instruction_context_chars,
                progress=progress,
            )
            if not args.dry_run and args.skip_qa:
                status_writer.write(
                    make_status_record(
                        row=row,
                        row_number=offset,
                        task_id=task_id,
                        result=result,
                        status="SKIPPED",
                        stage="qa",
                        details="QA skipped by --skip-qa.",
                    )
                )
            elif not args.dry_run:
                qa_result = run_generated_task_qa(
                    result.task_path,
                    output_dir=qa_output_root / result.task_id,
                    progress=progress,
                    timeout_seconds=args.qa_timeout_seconds,
                )
                status_writer.write(
                    make_status_record(
                        row=row,
                        row_number=offset,
                        task_id=task_id,
                        result=result,
                        status="PASS" if qa_result.passed else "FAIL",
                        stage=qa_result.failed_stage or "qa",
                        details=summarize_post_generation_qa(qa_result),
                        qa_result=qa_result,
                    )
                )
                if qa_result.returncode != 0:
                    qa_failures.append((result.task_id, qa_result.returncode, qa_result.failed_stage))
                    if not args.continue_on_qa_failure:
                        sys.stderr.write(
                            f"Error generating row {offset}: QA failed for "
                            f"{result.task_id} with exit code {qa_result.returncode}\n"
                        )
                        return qa_result.returncode
        except Exception as exc:
            if not args.dry_run:
                status_writer.write(
                    make_status_record(
                        row=row,
                        row_number=offset,
                        task_id=task_id,
                        result=result,
                        status="ERROR",
                        stage="generation",
                        details=trim_single_line(str(exc), 600),
                    )
                )
            sys.stderr.write(f"Error generating row {offset}: {exc}\n")
            return 1
        results.append(result)

    if args.dry_run:
        for result in results:
            print(f"Would generate {result.task_id} from {result.source_archive}")
        return 0

    print(f"Generated {len(results)} task(s):")
    for result in results:
        tests = ", ".join(result.reference_test_files) or "none"
        print(f"- {result.task_id}: {result.task_path}")
        print(f"  repo={result.repository} base={result.base_commit[:12]} fix={result.fix_commit[:12]}")
        print(f"  visible_command={result.visible_command}")
        print(f"  reference_tests={tests}")
    if qa_failures:
        print("QA failures:")
        for task_id, returncode, failed_stage in qa_failures:
            print(f"- {task_id}: {failed_stage or 'qa'} exit code {returncode}")
        return 1
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate FrontierCode-style Harbor tasks from spreadsheet rows."
    )
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--rows-csv", type=Path, help="CSV export with the Potential Tasks headers.")
    source.add_argument("--row-json", help="One row as a JSON object, or a JSON list of row objects.")
    source.add_argument("--row-json-file", type=Path, help="JSON file containing one row object or a list of rows.")
    source.add_argument(
        "--sheet-url",
        help=(
            "Google Sheets URL to fetch as an unauthenticated CSV export. "
            "Use --rows-csv if the sheet is private."
        ),
    )
    parser.add_argument("--gid", help="Sheet gid for --sheet-url. Defaults to the gid in the URL.")
    parser.add_argument("--repo-root", type=Path, default=Path.cwd(), help="Workspace root.")
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path("generated_tasks"),
        help="Directory where generated task folders are written.",
    )
    parser.add_argument(
        "--row-number",
        type=int,
        default=1,
        help="1-based data row to start from, excluding the CSV header. Default: 1.",
    )
    parser.add_argument("--limit", type=positive_int, default=1, help="Number of rows to generate.")
    parser.add_argument(
        "--instruction-model",
        default=os.environ.get("INSTRUCTION_MODEL", DEFAULT_INSTRUCTION_MODEL),
        help=f"Model used to generate instruction.md. Default: {DEFAULT_INSTRUCTION_MODEL}.",
    )
    parser.add_argument(
        "--instruction-timeout-seconds",
        type=positive_int,
        default=180,
        help="Timeout for each instruction generation model call.",
    )
    parser.add_argument(
        "--instruction-context-chars",
        type=positive_int,
        default=DEFAULT_INSTRUCTION_CONTEXT_CHARS,
        help="Maximum public repo-context characters sent to the instruction model.",
    )
    parser.add_argument("--force", action="store_true", help="Replace existing generated task folders.")
    parser.add_argument("--dry-run", action="store_true", help="Validate inputs without writing task files.")
    parser.add_argument(
        "--skip-qa",
        action="store_true",
        help="Do not run structure-qa and full qa after each generated task.",
    )
    parser.add_argument(
        "--qa-output-root",
        type=Path,
        help="Directory for generated QA reports. Default: <output-root>/_qa.",
    )
    parser.add_argument(
        "--qa-timeout-seconds",
        type=positive_int,
        default=900,
        help="Timeout for each post-generation QA command.",
    )
    parser.add_argument(
        "--continue-on-qa-failure",
        action="store_true",
        help="Continue generating later rows if post-generation QA fails for a task.",
    )
    parser.add_argument(
        "--qa-status-csv",
        type=Path,
        help="CSV file to upsert QA status rows. Default: <qa-output-root>/qa_status.csv.",
    )
    parser.add_argument(
        "--no-qa-status-csv",
        action="store_true",
        help="Do not write the local QA status CSV.",
    )
    parser.add_argument("--quiet", action="store_true", help="Hide progress messages.")
    return parser


def load_rows(args: argparse.Namespace) -> Iterable[dict[str, str]]:
    if args.rows_csv:
        with args.rows_csv.open(newline="", encoding="utf-8-sig") as handle:
            yield from csv.DictReader(handle)
    elif args.row_json:
        yield from rows_from_json_text(args.row_json)
    elif args.row_json_file:
        yield from rows_from_json_text(args.row_json_file.read_text(encoding="utf-8"))
    elif args.sheet_url:
        yield from rows_from_sheet_url(args.sheet_url, args.gid)
    else:
        raise AssertionError("argparse should require one row source")


def rows_from_json_text(text: str) -> Iterable[dict[str, str]]:
    data = json.loads(text)
    if isinstance(data, dict):
        yield {str(key): str(value) for key, value in data.items()}
    elif isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                raise ValueError("JSON row lists must contain objects")
            yield {str(key): str(value) for key, value in item.items()}
    else:
        raise ValueError("JSON input must be an object or a list of objects")


def rows_from_sheet_url(sheet_url: str, gid: str | None) -> Iterable[dict[str, str]]:
    export_url = sheet_csv_export_url(sheet_url, gid)
    with urllib.request.urlopen(export_url, timeout=60) as response:
        text = response.read().decode("utf-8-sig")
    yield from csv.DictReader(io.StringIO(text))


def sheet_csv_export_url(sheet_url: str, gid: str | None) -> str:
    spreadsheet_id, resolved_gid = parse_sheet_url(sheet_url, gid)
    return (
        f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export"
        f"?format=csv&gid={urllib.parse.quote(resolved_gid)}"
    )


def parse_sheet_url(sheet_url: str, gid: str | None) -> tuple[str, str]:
    parsed = urllib.parse.urlparse(sheet_url)
    match = re.search(r"/spreadsheets/d/([^/]+)", parsed.path)
    if not match:
        raise ValueError("Could not find spreadsheet id in sheet URL")
    spreadsheet_id = match.group(1)
    query = urllib.parse.parse_qs(parsed.query)
    fragment_query = urllib.parse.parse_qs(parsed.fragment)
    resolved_gid = gid or first(query.get("gid")) or first(fragment_query.get("gid"))
    if not resolved_gid:
        raise ValueError("Could not find gid in sheet URL; pass --gid for --sheet-url")
    return spreadsheet_id, resolved_gid


def first(values: list[str] | None) -> str | None:
    return values[0] if values else None


def validate_row(row: dict[str, str], row_number: int) -> None:
    missing = [name for name in REQUIRED_COLUMNS if not row.get(name, "").strip()]
    if missing:
        raise ValueError(f"Row {row_number} is missing required columns: {', '.join(missing)}")


class QAStatusCsvWriter:
    def __init__(
        self,
        *,
        csv_path: Path | None,
        progress: Progress,
    ) -> None:
        self.csv_path = csv_path
        self.progress = progress

    def write(self, record: QAStatusRecord) -> None:
        if self.csv_path is None:
            return
        write_qa_status_csv(self.csv_path, record)
        self.progress.step(f"{record.task_id}: wrote QA status {record.status} to {self.csv_path}")


def build_qa_status_writer(
    args: argparse.Namespace,
    qa_output_root: Path,
    progress: Progress,
) -> QAStatusCsvWriter:
    csv_path = None
    if not args.no_qa_status_csv:
        csv_path = (args.qa_status_csv or qa_output_root / "qa_status.csv").resolve()
    return QAStatusCsvWriter(csv_path=csv_path, progress=progress)


def resolve_qa_output_root(args: argparse.Namespace, output_root: Path) -> Path:
    return (args.qa_output_root or output_root / "_qa").resolve()


def make_status_record(
    *,
    row: dict[str, str],
    row_number: int,
    task_id: str,
    result: GenerationResult | None,
    status: str,
    stage: str,
    details: str,
    qa_result: PostGenerationQAResult | None = None,
) -> QAStatusRecord:
    return QAStatusRecord(
        task_id=task_id,
        repository=row.get("Repository", "").strip(),
        data_row_number=row_number,
        sheet_row_number=row_number + 1,
        status=status,
        stage=stage,
        updated_at=utc_timestamp(),
        details=trim_single_line(details, 1000),
        task_path=str(result.task_path) if result is not None else "",
        report_path=str(qa_report_json_path(qa_result)) if qa_result is not None else "",
    )


def summarize_post_generation_qa(qa_result: PostGenerationQAResult) -> str:
    if qa_result.passed:
        return "QA passed."
    prefix = f"{qa_result.failed_stage or 'qa'} failed with exit code {qa_result.returncode}."
    if qa_result.failed_stage == "structure-qa":
        summary = summarize_structure_qa_report(qa_result.structure_output / "task_qa.json")
    else:
        summary = summarize_full_qa_report(qa_result.full_output / "qa.json")
    return trim_single_line(f"{prefix} {summary}".strip(), 1000)


def summarize_structure_qa_report(path: Path) -> str:
    reports = read_json_list(path)
    if not reports:
        return f"No structure QA JSON report found at {path}."
    failing = [item for item in reports if not bool(item.get("passed", False))]
    if not failing:
        return "Structure QA report did not contain failing tasks."
    details = []
    for item in failing:
        errors = [str(error) for error in item.get("errors", [])]
        warnings = [str(warning) for warning in item.get("warnings", [])]
        task_id = str(item.get("task_id", "unknown task"))
        message = "; ".join((errors or warnings)[:3]) or "no details"
        details.append(f"{task_id}: {message}")
    return trim_single_line("; ".join(details), 1000)


def summarize_full_qa_report(path: Path) -> str:
    reports = read_json_list(path)
    if not reports:
        return f"No full QA JSON report found at {path}."
    failing = [item for item in reports if not bool(item.get("passed", False))]
    if not failing:
        return "Full QA report did not contain failing tasks."
    details = []
    for item in failing:
        task_id = str(item.get("task_id", "unknown task"))
        deterministic_errors = [str(error) for error in item.get("deterministic_errors", [])]
        failed_checks = [
            f"{check.get('check_id', 'unknown_check')}: {check.get('summary', 'failed')}"
            for check in item.get("check_results", [])
            if not bool(check.get("passed", False))
        ]
        message = "; ".join((deterministic_errors + failed_checks)[:3]) or "no details"
        details.append(f"{task_id}: {message}")
    return trim_single_line("; ".join(details), 1000)


def qa_report_json_path(qa_result: PostGenerationQAResult) -> Path:
    full_report = qa_result.full_output / "qa.json"
    if full_report.exists():
        return full_report
    structure_report = qa_result.structure_output / "task_qa.json"
    if structure_report.exists():
        return structure_report
    return qa_result.output_dir


def read_json_list(path: Path) -> list[dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    if isinstance(data, dict):
        return [data]
    return []


def write_qa_status_csv(path: Path, record: QAStatusRecord) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, str]] = []
    if path.exists():
        with path.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            rows = [
                {field: str(row.get(field, "")) for field in QA_STATUS_CSV_FIELDS}
                for row in reader
            ]
    row_data = record.to_csv_row()
    replaced = False
    for index, existing in enumerate(rows):
        if existing.get("Task ID") == record.task_id:
            rows[index] = {**existing, **row_data}
            replaced = True
            break
    if not replaced:
        rows.append(row_data)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(QA_STATUS_CSV_FIELDS))
        writer.writeheader()
        writer.writerows(rows)


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def trim_single_line(value: str, limit: int) -> str:
    compact = " ".join(str(value).split())
    if len(compact) <= limit:
        return compact
    return compact[:limit].rstrip() + "...<truncated>"


def safe_task_id(row: dict[str, str], row_number: int) -> str:
    value = row.get("Task ID", "")
    return safe_slug(value) or f"row_{row_number}"


def safe_slug(value: str) -> str:
    try:
        return slug_task_id(value)
    except ValueError:
        return ""


def run_generated_task_qa(
    task_path: Path,
    *,
    output_dir: Path,
    progress: Progress,
    timeout_seconds: int,
) -> PostGenerationQAResult:
    output_dir.mkdir(parents=True, exist_ok=True)
    structure_output = output_dir / "structure"
    full_output = output_dir / "full"

    structure_command = [
        sys.executable,
        "-m",
        "frontiercode_harness.cli",
        "structure-qa",
        "--path",
        str(task_path),
        "--output",
        str(structure_output),
    ]
    full_command = [
        sys.executable,
        "-m",
        "frontiercode_harness.cli",
        "qa",
        "--path",
        str(task_path),
        "--output",
        str(full_output),
    ]

    progress.step(f"{task_path.name}: running structure-qa")
    structure_result = run_qa_command(
        structure_command,
        progress=progress,
        label=f"{task_path.name}: structure-qa",
        timeout_seconds=timeout_seconds,
    )
    if structure_result.returncode != 0:
        return PostGenerationQAResult(
            passed=False,
            returncode=structure_result.returncode,
            failed_stage="structure-qa",
            output_dir=output_dir,
            structure_output=structure_output,
            full_output=full_output,
        )

    progress.step(f"{task_path.name}: running full qa")
    full_result = run_qa_command(
        full_command,
        progress=progress,
        label=f"{task_path.name}: full qa",
        timeout_seconds=timeout_seconds,
    )
    return PostGenerationQAResult(
        passed=full_result.returncode == 0,
        returncode=full_result.returncode,
        failed_stage="" if full_result.returncode == 0 else "full qa",
        output_dir=output_dir,
        structure_output=structure_output,
        full_output=full_output,
    )


def run_qa_command(
    command: list[str],
    *,
    progress: Progress,
    label: str,
    timeout_seconds: int,
) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    src_path = str((Path(__file__).resolve().parents[1] / "src").resolve())
    existing_pythonpath = env.get("PYTHONPATH")
    env["PYTHONPATH"] = (
        src_path if not existing_pythonpath else src_path + os.pathsep + existing_pythonpath
    )
    try:
        with progress.loading(label):
            return subprocess.run(
                command,
                env=env,
                stdin=subprocess.DEVNULL,
                timeout=timeout_seconds,
                check=False,
            )
    except subprocess.TimeoutExpired:
        progress.step(f"{label}: timed out after {timeout_seconds}s")
        return subprocess.CompletedProcess(command, 124)


def generate_task(
    row: dict[str, str],
    repo_root: Path,
    output_root: Path,
    *,
    force: bool,
    dry_run: bool,
    instruction_model: str,
    instruction_timeout_seconds: int,
    instruction_context_chars: int,
    progress: Progress,
) -> GenerationResult:
    task_id = slug_task_id(row["Task ID"])
    task_path = output_root / task_id
    source_archive = resolve_workspace_path(repo_root, row["Source Archive"])
    archive_root = row["Archive Repo Root"].strip() or "."
    base_commit = row["Base Commit"].strip()
    fix_commit = row["Fix Commit"].strip()

    if not source_archive.exists():
        raise FileNotFoundError(f"Source archive does not exist: {source_archive}")
    if task_path.exists() and not force and not dry_run:
        raise FileExistsError(f"Task already exists: {task_path} (pass --force to replace it)")

    with tempfile.TemporaryDirectory(prefix="frontiercode-generate-") as tmp:
        tmp_path = Path(tmp)
        extracted = tmp_path / "archive"
        progress.step(f"{task_id}: extracting {row['Source Archive'].strip()}")
        extract_zip(source_archive, extracted)
        source_repo = (extracted / archive_root).resolve() if archive_root != "." else extracted.resolve()
        if not (source_repo / ".git").exists():
            raise FileNotFoundError(f"Archive repo root does not contain .git: {source_repo}")

        progress.step(f"{task_id}: verifying commits")
        verify_commit(source_repo, base_commit)
        verify_commit(source_repo, fix_commit)
        progress.step(f"{task_id}: reading changed files")
        changed = git_changed_paths(source_repo, base_commit, fix_commit)
        reference_test_files = [
            path for status, path in changed
            if status != "D" and is_test_path(path) and git_path_exists(source_repo, fix_commit, path)
        ]
        visible_command = choose_visible_command(
            row["Visible Test Command Guess"],
            source_repo,
            row,
            reference_test_files,
        )
        progress.step(
            f"{task_id}: {len(changed)} changed file(s), "
            f"{len(reference_test_files)} reference test file(s), command `{visible_command}`"
        )

        if dry_run:
            progress.step(f"{task_id}: dry-run complete")
            return GenerationResult(
                task_id=task_id,
                task_path=task_path,
                repository=row["Repository"].strip(),
                source_archive=source_archive,
                base_commit=base_commit,
                fix_commit=fix_commit,
                visible_command=visible_command,
                reference_test_files=tuple(reference_test_files),
                changed_paths=tuple(path for _, path in changed),
            )

        tmp_task_path = output_root / f".{task_id}.tmp"
        if tmp_task_path.exists():
            shutil.rmtree(tmp_task_path)
        try:
            progress.step(f"{task_id}: writing task files")
            create_task_files(
                row=row,
                source_repo=source_repo,
                source_archive=source_archive,
                task_path=tmp_task_path,
                task_id=task_id,
                base_commit=base_commit,
                fix_commit=fix_commit,
                changed=changed,
                reference_test_files=reference_test_files,
                visible_command=visible_command,
                instruction_model=instruction_model,
                instruction_timeout_seconds=instruction_timeout_seconds,
                instruction_context_chars=instruction_context_chars,
                progress=progress,
            )
            if task_path.exists():
                progress.step(f"{task_id}: replacing existing task folder")
                shutil.rmtree(task_path)
            tmp_task_path.rename(task_path)
            progress.step(f"{task_id}: generated at {task_path}")
        except Exception:
            if tmp_task_path.exists():
                shutil.rmtree(tmp_task_path)
            raise

    return GenerationResult(
        task_id=task_id,
        task_path=task_path,
        repository=row["Repository"].strip(),
        source_archive=source_archive,
        base_commit=base_commit,
        fix_commit=fix_commit,
        visible_command=visible_command,
        reference_test_files=tuple(reference_test_files),
        changed_paths=tuple(path for _, path in changed),
    )


def copy_task_tree(source: Path, target: Path) -> None:
    shutil.copytree(source, target, ignore=task_tree_ignore(source), dirs_exist_ok=False)


def task_tree_ignore(source: Path):
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


def create_task_files(
    *,
    row: dict[str, str],
    source_repo: Path,
    source_archive: Path,
    task_path: Path,
    task_id: str,
    base_commit: str,
    fix_commit: str,
    changed: list[tuple[str, str]],
    reference_test_files: list[str],
    visible_command: str,
    instruction_model: str,
    instruction_timeout_seconds: int,
    instruction_context_chars: int,
    progress: Progress,
) -> None:
    env_repo = task_path / "environment" / "repo"
    hidden_dir = task_path / "tests" / "hidden"
    grader_dir = task_path / "tests" / "grader"
    calibration_dir = grader_dir / "calibration"
    reference_tests_dir = hidden_dir / "reference_tests"

    progress.step(f"{task_id}: creating Harbor task layout")
    env_repo.mkdir(parents=True)
    hidden_dir.mkdir(parents=True)
    grader_dir.mkdir(parents=True)
    calibration_dir.mkdir(parents=True)
    reference_tests_dir.mkdir(parents=True)

    progress.step(f"{task_id}: exporting base repository snapshot")
    export_commit(source_repo, base_commit, env_repo)
    progress.step(f"{task_id}: copying hidden base snapshot")
    copy_task_tree(env_repo, hidden_dir / "base_repo")

    progress.step(f"{task_id}: extracting {len(reference_test_files)} reference test file(s)")
    for rel in reference_test_files:
        data = git_show_bytes(source_repo, fix_commit, rel)
        target = reference_tests_dir / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)

    progress.step(f"{task_id}: writing private reference patch and grader metadata")
    reference_patch = git_diff(source_repo, base_commit, fix_commit)
    (calibration_dir / "reference.patch").write_text(reference_patch, encoding="utf-8")
    (grader_dir / "source_row.json").write_text(
        json.dumps(row, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    changed_paths = [path for _, path in changed]
    # Allow edits anywhere in the packages the reference fix actually touches, not
    # just the dirs that already contained reference tests. Otherwise a multi-package
    # task false-negatives on scope when the agent adds a test in a touched package
    # that the reference commit happened not to add a test to.
    allowed_prefixes = sorted(
        {prefix for path in changed_paths if (prefix := parent_prefix(path))}
    )
    spec = {
        "task_id": task_id,
        "repository": row["Repository"].strip(),
        "base_commit": base_commit,
        "fix_commit": fix_commit,
        "source_archive": row["Source Archive"].strip(),
        "visible_test_command": visible_command,
        "original_visible_test_command": row["Visible Test Command Guess"].strip(),
        "reference_test_files": reference_test_files,
        "allowed_changed_paths": changed_paths,
        "allowed_changed_prefixes": allowed_prefixes,
        "max_changed_files": max(len(changed_paths) + 3, 6),
        "max_changed_lines": max(changed_line_count(reference_patch) * 3, 250),
        "test_timeout_seconds": 600,
        "advisory_rubric_items": build_advisory_rubric_items(
            row=row,
            visible_command=visible_command,
            reference_test_files=reference_test_files,
            changed_paths=changed_paths,
        ),
    }
    (hidden_dir / "task_spec.json").write_text(
        json.dumps(spec, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    run_criteria = hidden_dir / "run_criteria.py"
    run_criteria.write_text(RUN_CRITERIA_TEMPLATE, encoding="utf-8")
    run_criteria.chmod(0o755)

    test_sh = task_path / "tests" / "test.sh"
    test_sh.write_text(render_test_sh(), encoding="utf-8")
    test_sh.chmod(0o755)

    instruction_text = generate_instruction_markdown(
        row=row,
        repo=env_repo,
        changed_paths=changed_paths,
        reference_test_files=reference_test_files,
        visible_command=visible_command,
        model=instruction_model,
        timeout_seconds=instruction_timeout_seconds,
        max_context_chars=instruction_context_chars,
        progress=progress,
    )
    (task_path / "instruction.md").write_text(
        instruction_text,
        encoding="utf-8",
    )
    progress.step(f"{task_id}: writing task.toml, Dockerfile, and grader manifest")
    (task_path / "task.toml").write_text(
        render_task_toml(task_id, row, detect_docker_image(env_repo, visible_command)),
        encoding="utf-8",
    )
    (task_path / "environment" / "Dockerfile").write_text(
        render_dockerfile(env_repo, visible_command),
        encoding="utf-8",
    )
    (grader_dir / "frontiercode.yaml").write_text(
        render_manifest(
            row,
            task_id,
            base_commit,
            fix_commit,
            visible_command,
            reference_test_files,
            changed_paths,
            allowed_prefixes,
            spec["max_changed_files"],
            spec["max_changed_lines"],
        ),
        encoding="utf-8",
    )


def render_test_sh() -> str:
    return """#!/usr/bin/env sh
set -eu

task_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repo="$task_root/environment/repo"

python3 "$task_root/tests/hidden/run_criteria.py" "$repo"
"""


def generate_instruction_markdown(
    *,
    row: dict[str, str],
    repo: Path,
    changed_paths: list[str],
    reference_test_files: list[str],
    visible_command: str,
    model: str,
    timeout_seconds: int,
    max_context_chars: int,
    progress: Progress,
) -> str:
    api_key = os.environ.get("QA_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("QA_API_KEY is required to generate instruction.md with an LLM")

    normalized_model = normalize_instruction_model(model)
    validation_feedback = ""
    for attempt in range(1, INSTRUCTION_GENERATION_ATTEMPTS + 1):
        system_prompt, user_prompt = build_instruction_prompt(
            row=row,
            repo=repo,
            changed_paths=changed_paths,
            reference_test_files=reference_test_files,
            visible_command=visible_command,
            max_context_chars=max_context_chars,
            validation_feedback=validation_feedback,
        )
        payload = {
            "model": normalized_model,
            "instructions": system_prompt,
            "input": user_prompt,
            "metadata": {
                "project": os.environ.get("FRONTIERCODE_PROJECT", "frontier-code"),
                "feature": "task-instruction-generation",
            },
        }
        request = urllib.request.Request(
            f"{normalize_base_url(os.environ.get('QA_BASE_URL'))}/responses",
            data=json.dumps(payload).encode("utf-8"),
            headers=inference_headers(api_key),
            method="POST",
        )
        try:
            with progress.loading(
                f"generating instruction.md with {normalized_model} "
                f"(attempt {attempt}/{INSTRUCTION_GENERATION_ATTEMPTS})"
            ):
                with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
                    response_data = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raise RuntimeError(f"instruction model request failed: {format_http_error(exc)}") from exc
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"instruction model request failed: {exc}") from exc

        instruction = clean_instruction_markdown(extract_response_text(response_data))
        try:
            validate_instruction_markdown(
                instruction,
                allow_over_max_total=attempt >= INSTRUCTION_GENERATION_ATTEMPTS,
            )
            if len(instruction.strip()) > 3000:
                progress.step(
                    "instruction.md is "
                    f"{len(instruction.strip())} characters after final retry; accepting"
                )
            return instruction
        except RuntimeError as exc:
            validation_feedback = str(exc)
            if attempt >= INSTRUCTION_GENERATION_ATTEMPTS:
                raise
            progress.step(f"instruction.md validation failed: {validation_feedback}; retrying")
    raise RuntimeError("instruction generation failed unexpectedly")


def build_instruction_prompt(
    *,
    row: dict[str, str],
    repo: Path,
    changed_paths: list[str],
    reference_test_files: list[str],
    visible_command: str,
    max_context_chars: int,
    validation_feedback: str = "",
) -> tuple[str, str]:
    system_prompt = (
        "You write concise FrontierCode Harbor instruction.md files for coding agents. "
        "Match the style of the provided example: direct maintainer request, concrete test "
        "guidance, lint guidance when the repo supports it, and style constraints. "
        "Make the task clear enough that a reviewer can tell what behavior, edge cases, "
        "and repo-specific workflow matter without overprescribing one implementation. "
        "Return only Markdown for instruction.md. Use ASCII only."
    )
    test_dirs = sorted({parent_prefix(path).rstrip("/") for path in reference_test_files if parent_prefix(path)})
    changed_source_paths = [
        path for path in changed_paths
        if path not in reference_test_files and not is_test_path(path)
    ][:40]
    context = build_public_repo_context(
        repo, max_context_chars=max_context_chars, changed_paths=changed_paths
    )
    example = """# Task description

Encapsulate all warning logs in a new `auto LOG_WARNING() -> std::ostream &` method in `src/logger.h` such that:

- Warnings are always printed to standard error
- Warnings are always printed, independently of `--verbose`
- The helper automatically prints the `warning:` prefix

Use this new function in every instance of `warning: <message>` messages throughout the codebase.

# Test guidelines

Run `make` and ensure no code changes remain. If there are more code changes, then it means that the code was not formatted properly.

Unless you are sure that the code change is already covered by an existing test case, always edit or create relevant tests (in the `./test` directory) to confirm the changes work and prevent regressions.

The tests are written using GoogleTest and POSIX shell scripts (not bash) and must be registered in the `test/CMakeLists.txt` build definition to run.

# Lint guidelines

Run `make configure compile` to compile and format the code in-place. The compile step comes with a large amount of linter-like checks.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
"""
    user_prompt = f"""
Write the complete instruction.md for one FrontierCode task.

Required output:
- Return Markdown only.
- Use these exact headings, in this order: # Task description, # Test guidelines, # Lint guidelines, # Style guidelines.
- Make the task description richer than a commit subject, but do not prescribe an exact patch strategy unless the maintainer request naturally would.
- The # Task description body should be 500-2000 characters, ideally around 1000 characters.
- The full instruction.md should be 1500-3000 characters, ideally around 2000 characters. Treat this as an important size target: avoid going over 3000 unless extra non-redundant task-specific constraints are genuinely needed.
- Do not repeat the same workflow, scope limit, or task requirement in multiple sections. Every sentence should add meaningful information for completing or patching the task.
- Include practical limitations and boundaries when useful: files or areas to avoid, compatibility constraints, environment assumptions, generated-output churn to avoid, or behaviors that must remain unchanged.
- Include the visible test command and the repo's real validation workflow.
- Mention relevant public test directories when useful, and say what behavior or edge cases those tests should cover.
- Describe success criteria in terms of observable behavior, not just one exact patch shape.
- Prefer clear reviewer-facing guidance over brittle implementation hints.
- When the change must integrate with existing interfaces, types, or function signatures shown in the repository context, describe the new or modified contract so it stays consistent with those definitions (interface method sets, return types, argument lists, exported names). Never describe a contract that contradicts the existing code.
- Do not mention the spreadsheet, task generation, fix commit, base commit, hidden tests, grader files, reference patches, answer keys, or private evaluation assets.
- Do not include commit SHAs.
- Do not say "source metadata", "reference", "oracle", or "hidden".
- Keep it concise and agent-facing.

Style example:
{example}

Task row:
- Repository: {row["Repository"].strip()}
- Task ID: {row["Task ID"].strip()}
- Bug / task description: {row["Bug / Task Description"].strip()}
- Commit subject for maintainer context: {row["Commit Subject"].strip()}
- Visible test command: {visible_command}
- Public test directories inferred from changed tests: {", ".join(test_dirs) if test_dirs else "none"}
- Public affected source paths inferred from task metadata: {", ".join(changed_source_paths) if changed_source_paths else "none"}

Public repository context:
{context}
""".strip()
    if validation_feedback:
        user_prompt += (
            "\n\nPrevious draft validation failed. Regenerate from scratch and fix this issue: "
            f"{validation_feedback}"
        )
    return system_prompt, user_prompt


def build_public_repo_context(
    repo: Path, *, max_context_chars: int, changed_paths: list[str] | None = None
) -> str:
    sections = []
    tree = "\n".join(public_repo_tree(repo, limit=450))
    if tree:
        sections.append("## File tree excerpt\n" + tree)
    # Existing source files alongside the change come first: the instruction
    # model needs the real local API surface (interfaces, types, signatures,
    # exported names) so it describes the new or modified contract accurately
    # instead of inventing one that the hidden reference tests reject.
    context_paths: list[Path] = []
    if changed_paths:
        context_paths.extend(sibling_source_files(repo, changed_paths))
    for path in selected_context_files(repo):
        if path not in context_paths:
            context_paths.append(path)
    for path in context_paths:
        rel = path.relative_to(repo).as_posix()
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        text = trim(text, 12_000)
        sections.append(f"## {rel}\n{text}")
    context = "\n\n".join(sections).strip()
    if len(context) <= max_context_chars:
        return context
    return context[:max_context_chars].rstrip() + "\n...<repo context truncated>..."


def sibling_source_files(repo: Path, changed_paths: list[str], *, max_files: int = 12) -> list[Path]:
    """Existing non-test source files in the directories the change touches.

    These give the instruction model the local API surface (interfaces, types,
    signatures, naming) so a new or modified contract is described to match the
    existing code rather than guessed.
    """
    changed_dirs = {parent_prefix(rel).rstrip("/") for rel in changed_paths}
    changed_dirs.discard("")
    changed_set = set(changed_paths)
    selected: list[Path] = []
    for path in iter_repo_files(repo):
        rel = path.relative_to(repo).as_posix()
        if rel in changed_set or is_test_path(rel) or is_low_signal_context_file(rel):
            continue
        if parent_prefix(rel).rstrip("/") not in changed_dirs:
            continue
        if not rel.lower().endswith(SOURCE_CONTEXT_EXTENSIONS):
            continue
        selected.append(path)
        if len(selected) >= max_files:
            break
    return selected


def trim(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    return value[:limit].rstrip() + "\n...<truncated>..."


def public_repo_tree(repo: Path, *, limit: int) -> list[str]:
    paths = []
    for path in iter_repo_files(repo):
        rel = path.relative_to(repo).as_posix()
        if is_low_signal_context_file(rel):
            continue
        paths.append(rel)
        if len(paths) >= limit:
            paths.append("...<file tree truncated>...")
            break
    return paths


def selected_context_files(repo: Path) -> list[Path]:
    selected_names = {
        ".clang-format",
        ".editorconfig",
        "AGENTS.md",
        "CONTRIBUTING",
        "CONTRIBUTING.md",
        "Makefile",
        "README",
        "README.md",
        "build.gradle",
        "go.mod",
        "package.json",
        "pom.xml",
        "pyproject.toml",
        "pytest.ini",
        "requirements.txt",
        "setup.cfg",
        "setup.py",
        "test.sh",
        "testing.md",
        "tox.ini",
    }
    candidates = []
    for path in iter_repo_files(repo):
        rel = path.relative_to(repo).as_posix()
        name = path.name
        if is_low_signal_context_file(rel):
            continue
        if name in selected_names or rel.endswith("/README.md") or rel.endswith("/package.json"):
            candidates.append(path)
    return sorted(candidates, key=lambda item: (item.relative_to(repo).as_posix().count("/"), item.relative_to(repo).as_posix()))[:30]


def iter_repo_files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIRS]
        for filename in sorted(filenames):
            if filename in SKIP_FILES:
                continue
            path = Path(dirpath) / filename
            if path.is_file():
                yield path


def is_low_signal_context_file(rel: str) -> bool:
    lower = rel.lower()
    return (
        lower.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".tar", ".gz"))
        or lower.endswith((".lock", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"))
        or "/public/assets/" in lower
        or "/vendor/" in lower
    )


def normalize_instruction_model(model: str) -> str:
    value = model.strip()
    if value in {"gpt5.5", "gpt-5.5"}:
        return DEFAULT_INSTRUCTION_MODEL
    if value in {"opus", "opus-4.8"}:
        return "anthropic/opus-4.8"
    return value or DEFAULT_INSTRUCTION_MODEL


def normalize_base_url(base_url: str | None) -> str:
    resolved = (base_url or DEFAULT_BASE_URL).strip().rstrip("/")
    if resolved == LEGACY_BASE_URL:
        return DEFAULT_BASE_URL
    return resolved


def inference_headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": os.environ.get("FRONTIERCODE_USER_AGENT", DEFAULT_USER_AGENT),
    }


def format_http_error(exc: urllib.error.HTTPError, *, max_body_chars: int = 1200) -> str:
    try:
        body = exc.read().decode("utf-8", errors="replace").strip()
    except Exception:
        body = ""
    finally:
        exc.close()
    if body:
        compact_body = " ".join(body.split())
        if len(compact_body) > max_body_chars:
            compact_body = compact_body[:max_body_chars].rstrip() + "..."
        return f"HTTP Error {exc.code}: {exc.reason}; response body: {compact_body}"
    return f"HTTP Error {exc.code}: {exc.reason}"


def extract_response_text(response_data: dict) -> str:
    content = response_data.get("content")
    if isinstance(content, str) and content.strip():
        return content
    if isinstance(content, list):
        joined = "\n".join(item for item in flatten_text_items(content) if item.strip()).strip()
        if joined:
            return joined
    output = response_data.get("output")
    if isinstance(output, list):
        joined = "\n".join(item for item in flatten_text_items(output) if item.strip()).strip()
        if joined:
            return joined
    choices = response_data.get("choices")
    if isinstance(choices, list) and choices:
        message = choices[0].get("message") if isinstance(choices[0], dict) else None
        if isinstance(message, dict) and isinstance(message.get("content"), str):
            return message["content"]
    raise RuntimeError(f"instruction model response did not contain text; keys={sorted(response_data.keys())}")


def flatten_text_items(value: object) -> list[str]:
    texts: list[str] = []
    if isinstance(value, str):
        texts.append(value)
    elif isinstance(value, list):
        for item in value:
            texts.extend(flatten_text_items(item))
    elif isinstance(value, dict):
        for key in ("text", "content", "output_text"):
            item = value.get(key)
            if isinstance(item, str):
                texts.append(item)
            elif isinstance(item, list):
                texts.extend(flatten_text_items(item))
        if "text" not in value and "content" not in value and "output_text" not in value:
            for item in value.values():
                if isinstance(item, (list, dict)):
                    texts.extend(flatten_text_items(item))
    return texts


def clean_instruction_markdown(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()
    marker = "# Task description"
    if marker in stripped and not stripped.startswith(marker):
        stripped = stripped[stripped.index(marker):].strip()
    return stripped.rstrip() + "\n"


def validate_instruction_markdown(text: str, *, allow_over_max_total: bool = False) -> None:
    required = [
        "# Task description",
        "# Test guidelines",
        "# Lint guidelines",
        "# Style guidelines",
    ]
    missing = [heading for heading in required if heading not in text]
    if missing:
        raise RuntimeError("generated instruction.md is missing headings: " + ", ".join(missing))
    task_description = markdown_section_body(text, "# Task description", "# Test guidelines")
    if not 500 <= len(task_description) <= 2000:
        raise RuntimeError(
            "generated instruction.md task description length is "
            f"{len(task_description)} characters; expected 500-2000"
        )
    stripped = text.strip()
    total_length = len(stripped)
    if total_length < 1500:
        raise RuntimeError(
            "generated instruction.md length is "
            f"{total_length} characters; expected at least 1500"
        )
    if total_length > 3000 and not allow_over_max_total:
        raise RuntimeError(
            "generated instruction.md length is "
            f"{total_length} characters; expected 1500-3000"
        )
    forbidden = [
        "spreadsheet",
        "task generation",
        "fix commit",
        "base commit",
        "hidden test",
        "hidden tests",
        "grader",
        "reference patch",
        "answer key",
        "source metadata",
        "oracle",
    ]
    lowered = text.lower()
    present = [phrase for phrase in forbidden if phrase in lowered]
    if present:
        raise RuntimeError("generated instruction.md contains forbidden private-context phrases: " + ", ".join(present))


def markdown_section_body(text: str, start_heading: str, end_heading: str) -> str:
    start_index = text.find(start_heading)
    if start_index < 0:
        return ""
    body_start = start_index + len(start_heading)
    end_index = text.find(end_heading, body_start)
    if end_index < 0:
        end_index = len(text)
    return text[body_start:end_index].strip()


def render_task_toml(task_id: str, row: dict[str, str], docker_image: str) -> str:
    name = task_id.replace("__", "-").replace("_", "-")
    description = f"FrontierCode-style task for {row['Repository'].strip()} generated from spreadsheet row {row['Task ID'].strip()}."
    return "\n".join(
        [
            f"name = {toml_string(name)}",
            f"description = {toml_string(description)}",
            'network_mode = "public"',
            f"docker_image = {toml_string(docker_image)}",
            "",
        ]
    )


def render_dockerfile(repo: Path, visible_command: str) -> str:
    image = detect_docker_image(repo, visible_command)
    install_lines = [
        "RUN apt-get update && apt-get install -y --no-install-recommends \\",
        "    ca-certificates curl git make patch build-essential python3-pip \\",
    ]
    if image.startswith("python:"):
        install_lines.append("    python3-venv \\")
    if command_needs_node(visible_command) and not image.startswith("node:"):
        install_lines.append("    nodejs npm \\")
    if command_needs_python(visible_command) and not image.startswith("python:"):
        install_lines.append("    python3 python3-pip python3-venv \\")
    install_lines.append("    && rm -rf /var/lib/apt/lists/*")

    dependency_steps = [
        "WORKDIR /testbed/frontiercode-repo",
        "COPY repo/ .",
        "RUN set -eux; \\",
        "    if command -v python3 >/dev/null 2>&1; then python3 -m pip install --break-system-packages --upgrade pip pytest; fi; \\",
        "    for req in requirements.txt server/requirements.txt; do \\",
        "      if [ -f \"$req\" ] && command -v python3 >/dev/null 2>&1; then python3 -m pip install --break-system-packages -r \"$req\"; fi; \\",
        "    done; \\",
        "    for pkg in package.json frontend/package.json; do \\",
        "      if [ -f \"$pkg\" ] && command -v npm >/dev/null 2>&1; then (cd \"$(dirname \"$pkg\")\" && npm install --legacy-peer-deps); fi; \\",
        "    done; \\",
        "    mkdir -p /environment; \\",
        "    ln -s /testbed/frontiercode-repo /environment/repo",
    ]
    return "\n".join([f"FROM {image}", *install_lines, "", *dependency_steps, "", "ENTRYPOINT []", ""]) + "\n"


def build_advisory_rubric_items(
    *,
    row: dict[str, str],
    visible_command: str,
    reference_test_files: list[str],
    changed_paths: list[str],
) -> list[dict[str, object]]:
    context = {
        "repository": row["Repository"].strip(),
        "task_description": row["Bug / Task Description"].strip(),
        "visible_command": visible_command,
        "reference_test_summary": ", ".join(reference_test_files) if reference_test_files else "the inferred task behavior",
        "affected_source_paths": ", ".join(
            path for path in changed_paths if not is_test_path(path)
        )
        or "the affected source paths",
    }
    items: list[dict[str, object]] = []
    for template in ADVISORY_RUBRIC_ITEM_TEMPLATES:
        item = dict(template)
        item["description"] = str(template["description"]).format(**context)
        item["prompt"] = str(template["prompt"]).format(**context)
        items.append(item)
    return items


def render_advisory_criteria_yaml(items: list[dict[str, object]]) -> str:
    lines: list[str] = []
    for item in items:
        lines.extend(
            [
                f"  - id: {item['id']}",
                f"    category: {item['category']}",
                "    description: >",
                yaml_block(str(item["description"]), indent_spaces=6),
                "    method: llm_prompt",
                "    blocker: false",
                f"    weight: {float(item['weight']):.2f}",
                "    threshold: 0.6",
                "    prompt: >",
                yaml_block(str(item["prompt"]), indent_spaces=6),
            ]
        )
    return "\n".join(lines)


def render_calibration_results_yaml(
    results: Iterable[tuple[str, bool, float]],
) -> str:
    lines: list[str] = []
    for criterion_id, passed, score in results:
        lines.extend(
            [
                f"      - criterion_id: {criterion_id}",
                f"        passed: {str(passed).lower()}",
                f"        score: {format_score(score)}",
            ]
        )
    return "\n".join(lines)


def format_score(value: float) -> str:
    if value == int(value):
        return str(int(value))
    return f"{value:.3f}".rstrip("0").rstrip(".")


def yaml_block(value: str, *, indent_spaces: int) -> str:
    text = " ".join(value.split()).strip()
    wrapped = textwrap.wrap(text, width=88) or [""]
    prefix = " " * indent_spaces
    return "\n".join(prefix + line for line in wrapped)


def render_manifest(
    row: dict[str, str],
    task_id: str,
    base_commit: str,
    fix_commit: str,
    visible_command: str,
    reference_test_files: list[str],
    changed_paths: list[str],
    allowed_prefixes: list[str],
    max_changed_files: int,
    max_changed_lines: int,
) -> str:
    test_summary = ", ".join(reference_test_files) if reference_test_files else "no changed test files"
    scope_allowed_paths = sorted(
        set(changed_paths)
        | {prefix for prefix in allowed_prefixes if prefix}
    )
    advisory_items = build_advisory_rubric_items(
        row=row,
        visible_command=visible_command,
        reference_test_files=reference_test_files,
        changed_paths=changed_paths,
    )
    no_op_results = [
        ("hidden_reference_tests_pass", False, 0),
        ("submitted_tests_fail_on_base", False, 0),
        ("visible_regression_tests_pass", True, 1),
        ("scope_matches_reference_intent", False, 0),
        ("no_hidden_asset_leak", True, 1),
        *((str(item["id"]), False, 0) for item in advisory_items),
    ]
    reference_results = [
        ("hidden_reference_tests_pass", True, 1),
        ("submitted_tests_fail_on_base", True, 1),
        ("visible_regression_tests_pass", True, 1),
        ("scope_matches_reference_intent", True, 1),
        ("no_hidden_asset_leak", True, 1),
        *((str(item["id"]), True, 0.8) for item in advisory_items),
    ]
    advisory_yaml = render_advisory_criteria_yaml(advisory_items)
    no_op_results_yaml = render_calibration_results_yaml(no_op_results)
    reference_results_yaml = render_calibration_results_yaml(reference_results)
    return f"""task_id: {task_id}
subset: extended
repo_workdir: environment/repo
base_commit: {base_commit}
low_quality_threshold: 0.5
source:
  repo: {yaml_scalar(row["Repository"].strip())}
  task_row_id: {yaml_scalar(row["Task ID"].strip())}
  source_archive: {yaml_scalar(row["Source Archive"].strip())}
  fix_commit: {fix_commit}
  commit_subject: {yaml_scalar(row["Commit Subject"].strip())}
  reference_test_files: {json.dumps(reference_test_files)}
criteria:
  - id: hidden_reference_tests_pass
    category: patch_specific
    description: >
      Hidden behavioral tests extracted from the source fix pass after the submitted patch.
      Reference test files: {test_summary}.
    method: classical
    blocker: true
    weight: 0.35
    command: python3 tests/hidden/run_criteria.py --criterion hidden_reference_tests_pass environment/repo
    timeout_seconds: 600
  - id: submitted_tests_fail_on_base
    category: regular
    description: >
      Submitted visible tests capture the task behavior because they fail against
      the original broken base snapshot before the implementation change.
    method: reverse_classical
    blocker: true
    weight: 0.15
    command: python3 tests/hidden/run_criteria.py --criterion submitted_tests_fail_on_base environment/repo
    timeout_seconds: 600
  - id: visible_regression_tests_pass
    category: regular
    description: >
      The repository's visible regression workflow still passes after the submitted patch.
      Generated command: {visible_command}.
    method: command
    blocker: true
    weight: 0.20
    command: python3 tests/hidden/run_criteria.py --criterion visible_regression_tests_pass environment/repo
    timeout_seconds: 600
  - id: scope_matches_reference_intent
    category: regular
    description: >
      The patch stays within the feature and test areas implicated by the source fix commit,
      avoiding unrelated rewrites or broad file churn.
    method: scope
    blocker: true
    weight: 0.15
    scope:
      allowed_paths: {json.dumps(scope_allowed_paths)}
      denied_paths: []
      max_files: {max_changed_files}
      max_changed_lines: {max_changed_lines}
  - id: no_hidden_asset_leak
    category: regular
    description: >
      The agent-visible repository does not contain generated hidden tests, grader assets,
      reference patches, or fix commit identifiers.
    method: command
    blocker: true
    weight: 0.05
    command: python3 tests/hidden/run_criteria.py --criterion no_hidden_asset_leak environment/repo
{advisory_yaml}
calibrations:
  - id: no-op-base
    type: hack
    description: Leaves the base repository unchanged, so hidden behavior and scope requirements are not satisfied.
    criteria_results:
{no_op_results_yaml}
  - id: reference-fix
    type: alternative_valid
    description: The source fix commit's patch, stored privately under tests/grader/calibration/reference.patch.
    patch: calibration/reference.patch
    criteria_results:
{reference_results_yaml}
"""


def choose_visible_command(
    command_guess: str,
    repo: Path,
    row: dict[str, str],
    reference_test_files: list[str],
) -> str:
    command = strip_parenthetical(command_guess).strip()
    # Strip a sentence-ending period only — not glob patterns like ./...
    if command.endswith(".") and not command.endswith(".."):
        command = command[:-1].rstrip()
    if command == "make":
        target = choose_make_target(repo, row, reference_test_files)
        if target:
            return f"make {target}"
    return command or fallback_test_command(repo)


def strip_parenthetical(value: str) -> str:
    stripped = value.strip()
    if "(" in stripped and stripped.endswith(")"):
        return stripped[: stripped.rfind("(")].strip()
    return stripped


def choose_make_target(repo: Path, row: dict[str, str], reference_test_files: list[str]) -> str | None:
    makefile = repo / "Makefile"
    if not makefile.exists():
        makefile = repo / "makefile"
    if not makefile.exists():
        return None
    targets = parse_make_targets(makefile.read_text(encoding="utf-8", errors="ignore"))
    if "test" in targets:
        return "test"
    test_targets = [target for target in targets if "test" in target.lower()]
    if not test_targets:
        return None
    words = token_set(
        " ".join(
            [
                row.get("Bug / Task Description", ""),
                row.get("Commit Subject", ""),
                " ".join(reference_test_files),
            ]
        )
    )
    scored = []
    for index, target in enumerate(test_targets):
        target_words = token_set(target.replace("-", " ").replace("_", " "))
        score = len(words & target_words)
        if target.startswith("test"):
            score += 1
        scored.append((score, -index, target))
    scored.sort(reverse=True)
    return scored[0][2]


def parse_make_targets(text: str) -> list[str]:
    targets = []
    for line in text.splitlines():
        if line.startswith(("\t", " ")):
            continue
        match = re.match(r"^([A-Za-z0-9_.-]+)\s*:(?![=])", line)
        if match:
            targets.append(match.group(1))
    return targets


def fallback_test_command(repo: Path) -> str:
    if (repo / "go.mod").exists():
        return "go test ./..."
    if (repo / "package.json").exists():
        return "npm test"
    if (repo / "pyproject.toml").exists() or (repo / "pytest.ini").exists():
        return "pytest"
    if (repo / "pom.xml").exists():
        return "mvn test"
    if (repo / "Makefile").exists():
        target = choose_make_target(repo, {}, [])
        return f"make {target}" if target else "make"
    return "pytest"


def detect_docker_image(repo: Path, visible_command: str) -> str:
    command = visible_command.lower()
    if "go test" in command or (repo / "go.mod").exists():
        return "golang:1.24-bookworm"
    if "mvn" in command or (repo / "pom.xml").exists():
        return "maven:3.9.9-eclipse-temurin-21"
    if "npm" in command or "node" in command:
        return "node:22-bookworm"
    if "cmake" in command or (repo / "CMakeLists.txt").exists():
        return "gcc:13.3"
    if command_needs_python(command) or has_python_project(repo):
        return "python:3.12-bookworm"
    return "python:3.12-bookworm"


def has_python_project(repo: Path) -> bool:
    return any(
        (repo / name).exists()
        for name in ("pyproject.toml", "pytest.ini", "requirements.txt", "setup.py", "setup.cfg")
    ) or (repo / "server" / "requirements.txt").exists()


def command_needs_python(command: str) -> bool:
    lower = command.lower()
    return any(token in lower for token in ("pytest", "python", "tox", "pip"))


def command_needs_node(command: str) -> bool:
    lower = command.lower()
    return any(token in lower for token in ("npm", "node", "yarn", "pnpm"))


def git_changed_paths(repo: Path, base_commit: str, fix_commit: str) -> list[tuple[str, str]]:
    output = run_git(repo, ["diff", "--name-status", base_commit, fix_commit]).stdout
    changed = []
    for line in output.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        status = parts[0][0]
        path = parts[-1]
        changed.append((status, path))
    return changed


def git_diff(repo: Path, base_commit: str, fix_commit: str) -> str:
    return run_git(repo, ["diff", "--binary", base_commit, fix_commit]).stdout


def changed_line_count(patch_text: str) -> int:
    return sum(
        1
        for line in patch_text.splitlines()
        if (line.startswith("+") and not line.startswith("+++"))
        or (line.startswith("-") and not line.startswith("---"))
    )


def git_show_bytes(repo: Path, commit: str, path: str) -> bytes:
    result = subprocess.run(
        ["git", "-C", str(repo), "show", f"{commit}:{path}"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace"))
    return result.stdout


def git_path_exists(repo: Path, commit: str, path: str) -> bool:
    result = subprocess.run(
        ["git", "-C", str(repo), "cat-file", "-e", f"{commit}:{path}"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    return result.returncode == 0


def verify_commit(repo: Path, commit: str) -> None:
    run_git(repo, ["rev-parse", "--verify", f"{commit}^{{commit}}"])


def run_git(repo: Path, args: list[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["git", "-C", str(repo), *args],
        text=True,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"git {' '.join(args)} failed")
    return result


def export_commit(repo: Path, commit: str, target: Path) -> None:
    tar_path = target.parent / f"{commit}.tar"
    with tar_path.open("wb") as handle:
        result = subprocess.run(
            ["git", "-C", str(repo), "archive", "--format=tar", commit],
            stdin=subprocess.DEVNULL,
            stdout=handle,
            stderr=subprocess.PIPE,
            check=False,
        )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace").strip())
    with tarfile.open(tar_path) as archive:
        safe_extract_tar(archive, target)
    tar_path.unlink()


def safe_extract_tar(archive: tarfile.TarFile, target: Path) -> None:
    target_resolved = target.resolve()
    for member in archive.getmembers():
        destination = (target / member.name).resolve()
        if destination != target_resolved and target_resolved not in destination.parents:
            raise RuntimeError(f"Unsafe tar member path: {member.name}")
    archive.extractall(target)


def extract_zip(source: Path, target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source) as archive:
        for member in archive.infolist():
            destination = (target / member.filename).resolve()
            target_resolved = target.resolve()
            if destination != target_resolved and target_resolved not in destination.parents:
                raise RuntimeError(f"Unsafe zip member path: {member.filename}")
        archive.extractall(target)


def is_test_path(path: str) -> bool:
    return bool(TEST_PATH_RE.search(path))


def resolve_workspace_path(repo_root: Path, value: str) -> Path:
    path = Path(value.strip())
    if path.is_absolute():
        return path
    return (repo_root / path).resolve()


def slug_task_id(value: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9_.-]+", "_", value.strip())
    slug = slug.strip("._-")
    if not slug:
        raise ValueError("Task ID produced an empty slug")
    return slug.lower()


def parent_prefix(path: str) -> str:
    parent = str(Path(path).parent).replace("\\", "/")
    if parent in {"", "."}:
        return ""
    return parent.rstrip("/") + "/"


def token_set(value: str) -> set[str]:
    return {token for token in re.split(r"[^A-Za-z0-9]+", value.lower()) if len(token) >= 3}


def yaml_scalar(value: str) -> str:
    if re.match(r"^[A-Za-z0-9_.:/@ -]+$", value) and value.strip() == value and ":" not in value:
        return value
    return json.dumps(value)


def toml_string(value: str) -> str:
    return json.dumps(value)


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("value must be greater than zero")
    return parsed


if __name__ == "__main__":
    raise SystemExit(main())
