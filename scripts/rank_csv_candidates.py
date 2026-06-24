#!/usr/bin/env python3
"""Rank the FrontierCode candidate CSV by probability of being a HARD, gradeable,
diversity-improving task — so generation mines high-value real commits instead of
sampling randomly.

Scoring is grounded in the calibration of the existing generated set
(scripts/analyze_difficulty.py):
  - encoding/string/single-function bugs are solved 5/5 -> penalize.
  - more files touched -> harder -> reward 2-6 changed files.
  - mid-size patches (30-250 LOC) are the sweet spot; tiny=trivial, huge=ungradeable.
  - ships tests -> gradeable + real behavioral change -> reward.
  - algo/distributed/concurrency domains carry the hard hits -> reward keywords.
  - Go is overrepresented (handcraft covers it); JS/TS + Python add diversity.
  - fold in the pool's own Confidence / Score mining signal.

Usage:
  python3 scripts/rank_csv_candidates.py [--top 100] [--lang JS/TS,Python] [--out PATH]
"""
from __future__ import annotations

import argparse
import csv
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_IN = ROOT / "FrontierCode Sample - Potential Tasks.csv"
CSV_OUT = ROOT / "generated_task_candidates" / "csv_ranked.csv"

# Go handcraft repos already overused; deprioritize to avoid doubling down.
HANDCRAFT_REPOS = {"swarmsync", "kindling", "drift", "bco", "durab", "cryograph"}

HARD_KW = [
    "concurren", "race", "deadlock", "lock", "mutex", "atomic", "thread",
    "consensus", "distribut", "replica", "merge", "conflict", "ordering",
    "transaction", "rollback", "isolation", "consistency", "idempoten",
    "async", "await", "promise", "queue", "scheduler", "backpressure",
    "protocol", "handshake", "state machine", "invariant", "boundary",
    "cache", "evict", "ttl", "retry", "backoff", "timeout", "deadline",
    "pagination", "cursor", "stream", "buffer", "overflow", "precision",
    "rounding", "timezone", "leap", "graph", "tree", "algorithm", "recursion",
    "permission", "auth", "token", "csrf", "session", "rate limit",
]
EASY_KW = [
    "typo", "rename", "comment", "docstring", "readme", "doc ", "lint",
    "format", "whitespace", "import order", "unused", "log message",
    "spelling", "wording", "copy", "label text",
]

def available_archives() -> set[str]:
    """Relative archive paths (as they appear in the CSV's Source Archive column)
    that actually exist under repositories/."""
    repo_dir = ROOT / "repositories"
    out: set[str] = set()
    for p in repo_dir.rglob("*.zip"):
        rel = p.relative_to(repo_dir).as_posix()
        out.add(rel)            # e.g. project_silver_repos/HASH__godhand.zip
        out.add(p.name)         # e.g. HASH__godhand.zip
    return out

def archive_present(r: dict, available: set[str]) -> bool:
    arch = (r.get("Source Archive") or "").strip()
    if not arch:
        return False
    return arch in available or Path(arch).name in available

def infer_lang(cmd: str) -> str:
    c = (cmd or "").lower()
    if "go test" in c or "gotest" in c:
        return "Go"
    if "pytest" in c or "python" in c:
        return "Python"
    if any(k in c for k in ("npm", "jest", "vitest", "yarn", "pnpm")):
        return "JS/TS"
    if "cargo" in c:
        return "Rust"
    if "mvn" in c or "gradle" in c:
        return "Java"
    return "unknown"

def num(v, default=0.0):
    try:
        return float(str(v).strip())
    except (TypeError, ValueError):
        return default

def score_row(r: dict) -> dict:
    loc = num(r.get("Patch Length (LOC)"))
    files = num(r.get("Changed File Count"))
    tests = num(r.get("Test File Count"))
    desc = f"{r.get('Bug / Task Description','')} {r.get('Commit Subject','')}".lower()
    lang = infer_lang(r.get("Visible Test Command Guess"))
    repo = (r.get("Repository") or "").strip().lower()
    mine_score = num(r.get("Score"))          # 8..32 original mining signal
    conf = (r.get("Confidence") or "").strip()

    comp = {}
    # patch size sweet spot
    if loc < 12:        comp["size"] = -25
    elif loc < 30:      comp["size"] = -5
    elif loc <= 120:    comp["size"] = 25
    elif loc <= 250:    comp["size"] = 18
    elif loc <= 400:    comp["size"] = 5
    else:               comp["size"] = -15
    # gradeability: need >=1 SOURCE (non-test) file to fix. source ~= changed - tests.
    # test-only commits (source<=0) have nothing to fix -> not gradeable (CSV-level guard;
    # the diff-level gradeability_triage.py catches test-infra disguised as source).
    source = files - tests
    if source <= 0:     comp["files"] = -50   # test-only -> effectively excluded
    elif files <= 1:    comp["files"] = -6    # single source file, often trivial
    elif files <= 6:    comp["files"] = 20 if source >= 2 else 12
    elif files <= 10:   comp["files"] = 6
    else:               comp["files"] = -12
    # ships tests ALONGSIDE a real source fix -> gradeable + real behavior change
    comp["tests"] = 12 if (tests >= 1 and source >= 1) else 0
    # domain keywords
    hard_hits = sum(1 for k in HARD_KW if k in desc)
    easy_hits = sum(1 for k in EASY_KW if k in desc)
    comp["domain"] = min(20, hard_hits * 6) - min(30, easy_hits * 15)
    # language diversity (Go overrepresented; reward JS/TS + Python)
    comp["lang"] = {"JS/TS": 12, "Python": 10, "Java": 6, "Rust": 6}.get(lang, 0)
    if lang == "Go":
        comp["lang"] = -6
    if repo in HANDCRAFT_REPOS:
        comp["lang"] -= 15
    # original mining quality
    comp["mining"] = (mine_score - 8) / (32 - 8) * 12  # 0..12
    comp["mining"] += {"high": 6, "medium-high": 3, "medium": 0}.get(conf, 0)

    total = round(sum(comp.values()), 1)
    return {"total": total, "lang": lang, **{f"c_{k}": round(v, 1) for k, v in comp.items()}}

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=100)
    ap.add_argument("--lang", default="", help="comma list to keep, e.g. 'JS/TS,Python'")
    ap.add_argument("--available-only", action="store_true",
                    help="keep only rows whose repo archive exists under repositories/ (generate-now list)")
    ap.add_argument("--out", type=Path, default=CSV_OUT)
    args = ap.parse_args()
    keep_langs = {x.strip() for x in args.lang.split(",") if x.strip()}
    available = available_archives()

    rows = list(csv.DictReader(open(CSV_IN)))
    scored = []
    for r in rows:
        s = score_row(r)
        if keep_langs and s["lang"] not in keep_langs:
            continue
        present = archive_present(r, available)
        if args.available_only and not present:
            continue
        # drop obvious test-only commits (changed <= tests): nothing for the agent to fix
        if num(r.get("Changed File Count")) > 0 and num(r.get("Changed File Count")) <= num(r.get("Test File Count")):
            continue
        scored.append({
            "score": s["total"], "lang": s["lang"], "archive": "yes" if present else "no",
            "repo": r.get("Repository", ""), "task_id": r.get("Task ID", ""),
            "loc": r.get("Patch Length (LOC)", ""), "files": r.get("Changed File Count", ""),
            "tests": r.get("Test File Count", ""), "confidence": r.get("Confidence", ""),
            "description": (r.get("Bug / Task Description", "") or "")[:160],
            "fix_commit": r.get("Fix Commit", ""), "source_archive": r.get("Source Archive", ""),
            "breakdown": " ".join(f"{k[2:]}={v:+g}" for k, v in s.items() if k.startswith("c_")),
        })
    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[: args.top]

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(top[0].keys()) if top else ["score"])
        w.writeheader()
        w.writerows(top)

    try:
        out_disp = args.out.resolve().relative_to(ROOT)
    except ValueError:
        out_disp = args.out
    print(f"Scored {len(scored)} rows (lang filter: {keep_langs or 'none'}).")
    print(f"Wrote top {len(top)} -> {out_disp}\n")
    print(f"Language mix of top {len(top)}: {dict(Counter(t['lang'] for t in top))}")
    print(f"\nTop 20 candidates:")
    print(f"  {'score':>5} {'lang':7} {'repo':22} {'loc':>4} {'files':>5} {'tests':>5}  description")
    for t in top[:20]:
        print(f"  {t['score']:>5} {t['lang']:7} {str(t['repo'])[:22]:22} {str(t['loc']):>4} "
              f"{str(t['files']):>5} {str(t['tests']):>5}  {t['description'][:70]}")

if __name__ == "__main__":
    main()
