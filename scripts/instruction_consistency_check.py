#!/usr/bin/env python3
"""Instruction <-> hidden-test consistency gate.

QA reviews the agent-visible surface (instruction + repo) but never sees the hidden tests,
so it can't catch the failure mode where a multi-part commit's instruction (from the commit
subject) describes a DIFFERENT part of the code than the hidden tests actually check
(e.g. meridian: instruction = "cycles", hidden tests = centrality/flow/shortest_path).
Such tasks are unsolvable-as-written and waste eval budget.

This deterministic check extracts the repo symbols/modules the hidden reference tests import
and exercise, and measures how many appear in instruction.md. Low overlap => likely mis-generated.

Usage:
  python3 scripts/instruction_consistency_check.py [TASK ...]      # specific tasks
  python3 scripts/instruction_consistency_check.py --all           # all generated tasks
  python3 scripts/instruction_consistency_check.py --threshold 0.3
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "generated_tasks"

STDLIB_OR_TEST = {
    "pytest", "unittest", "typing", "os", "sys", "re", "json", "math", "time", "datetime",
    "collections", "itertools", "functools", "pathlib", "dataclasses", "abc", "enum",
    "asyncio", "random", "string", "io", "contextlib", "tempfile", "subprocess", "warnings",
    "mock", "freezegun", "hypothesis", "numpy", "np", "pandas", "pd", "__future__",
}

def camel_snake_words(sym: str) -> set[str]:
    """Break a symbol into lowercase word tokens for fuzzy matching against prose."""
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", sym)
    return {w for w in re.split(r"[_\s.]+", s.lower()) if len(w) > 2}

def extract_test_symbols(test_files: list[Path]) -> tuple[set[str], set[str]]:
    """Return (modules, symbols) the tests import from the repo (excluding stdlib/test libs)."""
    modules, symbols = set(), set()
    for f in test_files:
        try:
            txt = f.read_text(errors="ignore")
        except OSError:
            continue
        for mod, names in re.findall(r"^\s*from\s+([\w.]+)\s+import\s+([^\n#]+)", txt, re.M):
            top = mod.split(".")[0]
            if top in STDLIB_OR_TEST:
                continue
            modules.add(mod)
            for n in re.split(r"[,\s()]+", names):
                n = n.strip().strip("\\")
                if n and n != "as" and not n.isupper() or (n and "_" in n):
                    if n and n.lower() not in {"as"}:
                        symbols.add(n)
        for mod in re.findall(r"^\s*import\s+([\w.]+)", txt, re.M):
            if mod.split(".")[0] not in STDLIB_OR_TEST:
                modules.add(mod)
    return modules, symbols

TEST_EXTS = (".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".java")

def reference_test_files(task_dir: Path) -> list[Path]:
    root = task_dir / "tests" / "hidden" / "reference_tests"
    return [p for p in root.rglob("*") if p.is_file() and p.suffix in TEST_EXTS] if root.exists() else []

def file_topics(test_files: list[Path]) -> set[str]:
    """Distinctive topic of each hidden test file, from its name (test_centrality.py -> 'centrality',
    payment.test.ts -> 'payment'). The cleanest signal for a topic mismatch like meridian."""
    topics = set()
    for f in test_files:
        stem = re.sub(r"(\.test|\.spec|_test|test_)", " ", f.stem, flags=re.I).strip()
        for w in camel_snake_words(stem):
            if w not in {"test", "tests", "spec", "index"}:
                topics.add(w)
    return topics

def check_task(task_dir: Path) -> dict:
    instr = task_dir / "instruction.md"
    if not instr.exists():
        return {"task": task_dir.name, "status": "no-instruction"}
    text = instr.read_text(errors="ignore").lower()
    test_files = reference_test_files(task_dir)
    if not test_files:
        return {"task": task_dir.name, "status": "no-hidden-tests"}
    modules, symbols = extract_test_symbols(test_files)
    # PRIMARY signal: do the hidden test FILE TOPICS appear in the instruction? (catches
    # topic mismatches like meridian even when symbol vocabulary overlaps)
    topics = file_topics(test_files)
    topics_covered = {t for t in topics if t in text}
    topic_cov = len(topics_covered) / len(topics) if topics else 1.0
    # SECONDARY: symbol coverage
    targets = symbols | {m.split(".")[-1] for m in modules}
    sym_covered = set()
    for t in targets:
        toks = camel_snake_words(t)
        if t.lower() in text or (toks and all(w in text for w in toks)):
            sym_covered.add(t)
    sym_cov = len(sym_covered) / len(targets) if targets else 1.0
    return {
        "task": task_dir.name, "status": "ok",
        "topic_cov": round(topic_cov, 2), "sym_cov": round(sym_cov, 2),
        "topics_missing": sorted(topics - topics_covered)[:8],
        "test_files": [f.name for f in test_files],
    }

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("tasks", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--threshold", type=float, default=0.3)
    args = ap.parse_args()

    if args.all:
        dirs = [p for p in GEN.iterdir() if p.is_dir() and (p / "instruction.md").exists()]
        dirs += [p for p in (GEN / "in_dist").glob("*") if (p / "instruction.md").exists()] if (GEN / "in_dist").exists() else []
    else:
        dirs = []
        for t in args.tasks:
            for cand in (GEN / t, GEN / "in_dist" / t):
                if cand.exists():
                    dirs.append(cand); break
    results = [check_task(d) for d in sorted(set(dirs))]
    ok = [r for r in results if r.get("status") == "ok"]
    # flag if the hidden tests' topics are largely absent from the instruction
    flagged = [r for r in ok if r["topic_cov"] < args.threshold]
    print(f"Checked {len(results)} task(s). FLAGGED (topic coverage < {args.threshold}): {len(flagged)}\n")
    print(f"  {'task':40} {'topicCov':>8} {'symCov':>6}  topics the hidden tests need but the instruction omits")
    for r in sorted(ok, key=lambda x: x["topic_cov"]):
        mark = "  <-- MIS-GEN" if r["topic_cov"] < args.threshold else ""
        print(f"  {r['task'][:40]:40} {r['topic_cov']:>8} {r['sym_cov']:>6}  {', '.join(r['topics_missing'][:6])}{mark}")
    other = [r for r in results if r.get("status") != "ok"]
    if other:
        print("\nnon-scored:", [(r['task'], r['status']) for r in other])

if __name__ == "__main__":
    main()
