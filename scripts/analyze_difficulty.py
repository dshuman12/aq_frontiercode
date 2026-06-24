#!/usr/bin/env python3
"""Characterize what makes a FrontierCode task hard for the frontier solver.

Joins each generated task's ground-truth pass rate (gpt-5.5, best effort, from
generated_tasks/_eval/*/frontiercode_summary.json) with structural features
pulled from its grader spec, and reports difficulty by repo / language / domain
keyword. The output is the empirical basis for the CSV candidate pre-filter.

Usage:  PYTHONPATH=src python3 scripts/analyze_difficulty.py
"""
from __future__ import annotations

import json
import re
import statistics
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "generated_tasks"

# repo -> language (Go handcraft repos vs real-repo CSV sources)
GO_REPOS = {"swarmsync", "kindling", "drift", "bco", "durab", "cryograph"}
PY_REPOS = {
    "godhand", "fastapi-rag-gateway", "healthcare-integration-platform",
    "authentication-oidc", "vaccination-tracker", "meridian", "nexusflow",
    "lecturn", "queryweave",
}

def language(repo: str) -> str:
    r = repo.lower()
    if r in GO_REPOS:
        return "Go"
    if r in PY_REPOS:
        return "Python/real"
    return "other"

# domain keyword groups (matched against task_id)
HARD_KW = [
    "crdt", "merge", "clock", "vector", "consensus", "bully", "gossip", "raft",
    "quorum", "lww", "orset", "pncounter", "ewflag", "mvregister", "rga", "hlc",
    "graph", "mincut", "boruvka", "dijkstra", "astar", "flow", "bipartite",
    "kcore", "katz", "closeness", "transitivity", "concurren", "race", "lock",
    "async", "liveness", "rebalance", "shard", "skiplist", "merkle", "swim",
]
EASY_KW = [
    "base32", "base64", "csv", "uri", "glob", "json", "format", "truncate",
    "encode", "decode", "newline", "escape", "string", "exponent", "ipv4",
]

def keyword_class(task_id: str) -> str:
    t = task_id.lower()
    hard = any(k in t for k in HARD_KW)
    easy = any(k in t for k in EASY_KW)
    if hard and not easy:
        return "algo/distributed"
    if easy and not hard:
        return "encoding/string"
    return "mixed/other"

def index_yamls() -> dict[str, Path]:
    out: dict[str, Path] = {}
    for y in GEN.rglob("tests/grader/frontiercode.yaml"):
        try:
            m = re.search(r"^task_id:\s*(\S+)", y.read_text(), re.M)
        except OSError:
            continue
        if m:
            out[m.group(1)] = y
    return out

def yaml_features(path: Path) -> dict:
    txt = path.read_text()
    def grab(pat, default=""):
        m = re.search(pat, txt, re.M)
        return m.group(1) if m else default
    repo = grab(r"^\s*repo:\s*(\S+)")
    ref_tests = grab(r"reference_test_files:\s*\[([^\]]*)\]")
    n_tests = len([x for x in ref_tests.split(",") if x.strip()]) if ref_tests else 0
    allowed = grab(r"allowed_paths:\s*\[([^\]]*)\]")
    n_paths = len([x for x in allowed.split(",") if x.strip()]) if allowed else 0
    return {"repo": repo, "n_tests": n_tests, "n_paths": n_paths}

def load_difficulty() -> dict[str, float]:
    out: dict[str, float] = {}
    for f in GEN.glob("_eval/*/frontiercode_summary.json"):
        try:
            data = json.loads(f.read_text())
        except OSError:
            continue
        if not data:
            continue
        best = max(data, key=lambda r: (r.get("final_pass_rate") or 0))
        out[f.parent.name] = best["final_pass_rate"]
    return out

def bucket(pr: float) -> str:
    if pr <= 0:
        return "too-hard"
    if pr >= 1:
        return "too-easy"
    return "in-band"

def report(title, groups):
    print(f"\n{'='*72}\n{title}\n{'='*72}")
    print(f"  {'group':22} {'n':>3} {'mean_pr':>7} {'in-band':>8} {'too-easy':>9} {'too-hard':>9}")
    for key, prs in sorted(groups.items(), key=lambda kv: statistics.mean(kv[1])):
        b = Counter(bucket(p) for p in prs)
        print(f"  {str(key)[:22]:22} {len(prs):>3} {statistics.mean(prs):>7.2f} "
              f"{b['in-band']:>8} {b['too-easy']:>9} {b['too-hard']:>9}")

def main() -> None:
    yamls = index_yamls()
    diff = load_difficulty()
    rows = []
    for task_id, pr in diff.items():
        y = yamls.get(task_id)
        feats = yaml_features(y) if y else {"repo": task_id.split("__")[0], "n_tests": 0, "n_paths": 0}
        repo = feats["repo"] or task_id.split("__")[0]
        rows.append({
            "task": task_id, "pr": pr, "repo": repo, "lang": language(repo),
            "kw": keyword_class(task_id), "n_tests": feats["n_tests"], "n_paths": feats["n_paths"],
        })
    print(f"Joined {len(rows)} tasks with difficulty + features.")

    report("BY LANGUAGE", {r["lang"]: None for r in rows} and
           defaultdict(list, {l: [r["pr"] for r in rows if r["lang"] == l] for l in {r["lang"] for r in rows}}))
    report("BY DOMAIN KEYWORD CLASS", defaultdict(list,
           {k: [r["pr"] for r in rows if r["kw"] == k] for k in {r["kw"] for r in rows}}))
    report("BY REPO", defaultdict(list,
           {rp: [r["pr"] for r in rows if r["repo"] == rp] for rp in {r["repo"] for r in rows}}))
    # files-touched proxy (allowed_paths count)
    def pbin(n):
        return "1-2 paths" if n <= 2 else "3-5 paths" if n <= 5 else "6+ paths"
    report("BY FILES-TOUCHED PROXY (allowed_paths)", defaultdict(list,
           {pbin(r["n_paths"]): [] for r in rows} | {pbin(r["n_paths"]): [x["pr"] for x in rows if pbin(x["n_paths"]) == pbin(r["n_paths"])] for r in rows}))

if __name__ == "__main__":
    main()
