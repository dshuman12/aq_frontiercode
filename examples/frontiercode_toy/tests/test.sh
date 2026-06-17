#!/usr/bin/env sh
set -eu

task_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

TASK_ROOT="$task_root" python3 - <<'PY'
import difflib
import os
from pathlib import Path
import subprocess


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
    fallback = repo.parent / "verifier-logs"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def render_submission_patch(base_repo: Path, repo: Path) -> str:
    if base_repo.exists():
        diff_chunks = []
        all_files = sorted(index_files(base_repo) | index_files(repo))
        for relative in all_files:
            base_path = base_repo / relative
            submitted_path = repo / relative
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

    if not (repo / ".git").exists():
        return ""
    result = subprocess.run(
        ["git", "-C", str(repo), "diff", "--binary", "HEAD"],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return result.stdout if result.returncode == 0 else ""


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


task_root = Path(os.environ["TASK_ROOT"])
base_repo = task_root / "tests" / "hidden" / "base_repo"
repo = task_root / "environment" / "repo"
(verifier_log_dir(repo) / "submission.patch").write_text(
    render_submission_patch(base_repo, repo),
    encoding="utf-8",
)

app = repo / "app.py"
raise SystemExit(0 if app.exists() else 1)
PY
