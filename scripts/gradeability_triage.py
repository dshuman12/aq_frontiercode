#!/usr/bin/env python3
"""Diff-level gradeability gate for FrontierCode candidates.

The CSV ranker rewards multi-file + test-shipping commits, but ~17-19% of the pool
are TEST-ONLY commits (nothing for the agent to fix) and others change only config/
docs. The smoke test caught two of these (worknest = Playwright e2e only, ledgercore
= pytest fixtures only). This script extracts each candidate's archive, diffs
base..fix, classifies every changed file, and keeps only candidates with >=1 real
SOURCE file changed -- the precondition for a gradeable behavioral task.

Cheap: git only, no LLM, no Docker. Extraction is cached per archive.

Usage:
  python3 scripts/gradeability_triage.py [--limit 40] [--lang JS/TS,Python]
"""
from __future__ import annotations

import argparse
import csv
import importlib.util
import re
import subprocess
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_IN = ROOT / "FrontierCode Sample - Potential Tasks.csv"
OUT = ROOT / "generated_task_candidates" / "csv_gradeable.csv"

_spec = importlib.util.spec_from_file_location("rcc", ROOT / "scripts" / "rank_csv_candidates.py")
rcc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rcc)

TEST_RE = re.compile(r"(^|/)(tests?|__tests__|e2e|specs?|testdata|fixtures?)(/|$)|"
                     r"(_test\.|\.test\.|\.spec\.|_spec\.|test_[^/]*\.py$|conftest\.py$)", re.I)
E2E_RE = re.compile(r"(^|/)(e2e)(/|$)|\.spec\.(ts|js)$|playwright", re.I)
CONFIG_RE = re.compile(r"(^|/)\.github/|(^|/)(dockerfile|makefile|\.gitignore|"
                       r"package-lock\.json|yarn\.lock|pnpm-lock\.yaml|go\.sum|go\.mod|"
                       r"pyproject\.toml|setup\.cfg|setup\.py|tsconfig[^/]*\.json|"
                       r"[^/]*\.config\.(ts|js|mjs|cjs)|[^/]*\.(toml|ini|cfg|lock|yml|yaml))$", re.I)
DOC_RE = re.compile(r"\.(md|rst|txt)$|(^|/)docs?/|(^|/)license", re.I)

def classify(path: str) -> str:
    if TEST_RE.search(path):
        return "test"
    if CONFIG_RE.search(path):
        return "config"
    if DOC_RE.search(path):
        return "doc"
    return "source"

def repo_root(extracted: Path) -> Path | None:
    for p in [extracted, *extracted.rglob("*")]:
        if p.is_dir() and (p / ".git").exists():
            return p
    return None

def changed_files(archive: Path, base: str, fix: str, cache: dict) -> list[str] | None:
    if archive not in cache:
        tmp = Path(tempfile.mkdtemp(prefix="gtriage-"))
        try:
            with zipfile.ZipFile(archive) as z:
                z.extractall(tmp)
        except zipfile.BadZipFile:
            cache[archive] = None
            return None
        cache[archive] = repo_root(tmp)
    root = cache[archive]
    if root is None:
        return None
    r = subprocess.run(["git", "-C", str(root), "diff", "--name-only", base, fix],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return None
    return [x for x in r.stdout.splitlines() if x.strip()]

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=40, help="triage the top-N available scored candidates")
    ap.add_argument("--lang", default="")
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args()
    keep_langs = {x.strip() for x in args.lang.split(",") if x.strip()}

    available = rcc.available_archives()
    rows = list(csv.DictReader(open(CSV_IN)))
    # score + filter to available, non-test-only, sorted
    scored = []
    for r in rows:
        if not rcc.archive_present(r, available):
            continue
        s = rcc.score_row(r)
        if keep_langs and s["lang"] not in keep_langs:
            continue
        ch = rcc.num(r.get("Changed File Count")); te = rcc.num(r.get("Test File Count"))
        if ch > 0 and ch <= te:
            continue
        scored.append((s["total"], s["lang"], r))
    scored.sort(key=lambda x: x[0], reverse=True)
    scored = scored[: args.limit]

    cache: dict = {}
    results = []
    for total, lang, r in scored:
        arch = ROOT / "repositories" / (r.get("Source Archive") or "").strip()
        files = changed_files(arch, r["Base Commit"].strip(), r["Fix Commit"].strip(), cache)
        if files is None:
            verdict, counts, src = "extract/diff-failed", {}, 0
        else:
            cls = [classify(f) for f in files]
            counts = {k: cls.count(k) for k in ("source", "test", "config", "doc")}
            src = counts["source"]
            e2e = any(E2E_RE.search(f) for f, c in zip(files, cls) if c == "test")
            if src == 0:
                verdict = "REJECT: no source files (test/config/doc-only)"
            elif counts["test"] == 0:
                verdict = "ok-but-no-tests"
            elif e2e and counts["test"] and all(E2E_RE.search(f) for f, c in zip(files, cls) if c == "test"):
                verdict = "RISK: e2e-only tests (hard to grade in Docker)"
            else:
                verdict = "GRADEABLE"
        results.append({"score": total, "lang": lang, "verdict": verdict,
                        "repo": r.get("Repository", ""), "task_id": r.get("Task ID", ""),
                        "source": counts.get("source", 0), "test": counts.get("test", 0),
                        "config": counts.get("config", 0), "doc": counts.get("doc", 0),
                        "fix_commit": r.get("Fix Commit", ""),
                        "description": (r.get("Bug / Task Description", "") or "")[:120]})

    gradeable = [r for r in results if r["verdict"] == "GRADEABLE"]
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(results[0].keys()))
        w.writeheader(); w.writerows([r for r in results if r["verdict"].startswith(("GRADEABLE", "ok", "RISK"))])

    from collections import Counter
    print(f"Triaged {len(results)} candidates. Verdicts: {dict(Counter(r['verdict'].split(':')[0] for r in results))}")
    print(f"Clean GRADEABLE: {len(gradeable)}  ->  {args.out.relative_to(ROOT)}\n")
    print(f"  {'score':>5} {'lang':7} {'verdict':12} {'src':>3} {'tst':>3} {'cfg':>3} {'repo':20} description")
    for r in results[:30]:
        v = r["verdict"].split(":")[0]
        print(f"  {r['score']:>5} {r['lang']:7} {v:12} {r['source']:>3} {r['test']:>3} {r['config']:>3} "
              f"{str(r['repo'])[:20]:20} {r['description'][:52]}")

if __name__ == "__main__":
    main()
