#!/usr/bin/env python3
"""Buildability gate: does a candidate repo's Docker image actually build?

Real-company repos often depend on PRIVATE registries (e.g. JS/TS @scope packages from
GitHub Packages -> npm 401 -> build fails -> ungradeable). This gate docker-builds each
candidate repo using the SAME Dockerfile the generator emits, and keeps only repos whose
image builds. Runs per unique repo (private-dep failures are repo-level) and caches.

Order in the pipeline: rank -> gradeability_triage -> buildability_check -> generate -> probe.

Usage:
  python3 scripts/buildability_check.py [--from csv_gradeable.csv] [--timeout 420] [--limit 0]
"""
from __future__ import annotations

import argparse
import csv
import importlib.util
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN_CSV = ROOT / "FrontierCode Sample - Potential Tasks.csv"
DEFAULT_FROM = ROOT / "generated_task_candidates" / "csv_gradeable.csv"
OUT = ROOT / "generated_task_candidates" / "buildable.csv"

# import the generator's Dockerfile logic so we test exactly what gets shipped
_spec = importlib.util.spec_from_file_location("genmod", ROOT / "scripts" / "generate_frontiercode_task.py")
genmod = importlib.util.module_from_spec(_spec)
sys.modules["genmod"] = genmod  # required so @dataclass can resolve cls.__module__
_spec.loader.exec_module(genmod)

def repo_root(extracted: Path) -> Path:
    for marker in (".git", "go.mod", "package.json", "pyproject.toml", "pom.xml"):
        hits = list(extracted.rglob(marker))
        if hits:
            return hits[0].parent
    return extracted

def build_one(archive: Path, visible_cmd: str, timeout: int) -> tuple[bool, str]:
    if not archive.exists():
        return False, f"archive missing: {archive.name}"
    tmp = Path(tempfile.mkdtemp(prefix="buildchk-"))
    try:
        with zipfile.ZipFile(archive) as z:
            z.extractall(tmp)
        root = repo_root(tmp)
        ctx = Path(tempfile.mkdtemp(prefix="buildctx-"))
        (ctx / "repo").mkdir()
        # copy repo contents into ctx/repo (the Dockerfile does COPY repo/ .)
        for item in root.iterdir():
            dst = ctx / "repo" / item.name
            if item.is_dir():
                shutil.copytree(item, dst, symlinks=True, ignore=shutil.ignore_patterns("node_modules", ".venv"))
            else:
                shutil.copy2(item, dst)
        dockerfile = genmod.render_dockerfile(root, visible_cmd or "")
        (ctx / "Dockerfile").write_text(dockerfile)
        tag = f"buildchk-{archive.stem.lower()[:40]}"
        try:
            r = subprocess.run(["docker", "build", "-q", "-t", tag, str(ctx)],
                               capture_output=True, text=True, timeout=timeout)
        except subprocess.TimeoutExpired:
            return False, f"build timed out after {timeout}s"
        if r.returncode == 0:
            subprocess.run(["docker", "rmi", "-f", tag], capture_output=True)
            return True, "ok"
        err = (r.stderr or r.stdout).strip().splitlines()
        snippet = " ".join(l for l in err if "error" in l.lower() or "401" in l or "E40" in l)[:200]
        return False, snippet or (err[-1][:200] if err else "build failed")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="src", type=Path, default=DEFAULT_FROM)
    ap.add_argument("--timeout", type=int, default=420)
    ap.add_argument("--limit", type=int, default=0, help="cap unique repos checked (0=all)")
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args()

    main_rows = {r["Task ID"]: r for r in csv.DictReader(open(MAIN_CSV))}
    cands = [r for r in csv.DictReader(open(args.src)) if r.get("verdict", "GRADEABLE") == "GRADEABLE"]
    # one representative row per repo (private-dep failures are repo-level)
    by_repo: dict[str, dict] = {}
    for c in cands:
        src = main_rows.get(c["task_id"])
        if src and src["Repository"] not in by_repo:
            by_repo[src["Repository"]] = src
    repos = list(by_repo.items())
    if args.limit:
        repos = repos[: args.limit]

    print(f"Buildability check: {len(repos)} unique repos (timeout {args.timeout}s each)\n")
    results = []
    for repo, src in repos:
        archive = ROOT / "repositories" / (src.get("Source Archive") or "").strip()
        cmd = src.get("Visible Test Command Guess", "")
        ok, reason = build_one(archive, cmd, args.timeout)
        results.append({"repo": repo, "buildable": "yes" if ok else "no", "reason": reason,
                        "test_cmd": cmd})
        print(f"  [{'BUILD OK ' if ok else 'BUILD FAIL'}] {repo:24} {('' if ok else reason)[:90]}")

    with open(args.out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["repo", "buildable", "test_cmd", "reason"])
        w.writeheader(); w.writerows(results)
    ok = sum(1 for r in results if r["buildable"] == "yes")
    print(f"\nBuildable: {ok}/{len(results)}  ->  {args.out.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
