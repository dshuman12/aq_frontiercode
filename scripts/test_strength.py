#!/usr/bin/env python3
"""Reference-test strength gate.

A task is only as hard as its hidden tests are discriminating. We repeatedly saw
shallow suites (`toBeGreaterThan(0)`, `toBeDefined`, `assert x is not None`,
`EXPECT_TRUE`) that any plausible patch satisfies -> the task reads too-easy OR the
bug isn't even caught (tests pass on the broken base = gradeability failure).

This deterministic check reads a generated task's hidden reference tests, classifies
each assertion as STRONG (exact value / structural equality) or WEAK (truthy /
existence / sign / not-throws), and flags tasks whose tests can't discriminate a
correct patch from a lazy one. Cheap pre-filter so calibration isn't wasted on them.

Usage:
  python3 scripts/test_strength.py TASK [TASK ...]
  python3 scripts/test_strength.py --all
  python3 scripts/test_strength.py --min-strong 3 --min-ratio 0.34 TASK
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "generated_tasks"
TEST_EXTS = (".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".java", ".cpp", ".cc", ".cxx", ".h", ".hpp")

# WEAK: assertion forms a near-empty / lazy patch can satisfy (existence, truthiness,
# sign, type, non-null, not-throws, length>0). Checked BEFORE strong so the trivial
# literals (toBe(true)/== 0) are caught here, not miscounted as exact-value strong.
WEAK = [
    r"\.toBeDefined\b", r"\.toBeUndefined\b", r"\.toBeNull\b", r"\.toBeTruthy\b",
    r"\.toBeFalsy\b", r"\.toBeInstanceOf\b", r"\.not\.toThrow\b",
    r"\.toBeGreaterThan(?:OrEqual)?\(\s*0\s*\)", r"\.toBeLessThan(?:OrEqual)?\(\s*0\s*\)",
    r"\.toThrow\(\s*\)", r"\.toBe\(\s*(?:true|false|null|undefined|0)\s*\)",
    r"\.toHaveLength\(\s*0\s*\)",
    # pytest / unittest
    r"\bassertTrue\b", r"\bassertFalse\b", r"\bassertIsNotNone\b", r"\bassertIsNone\b",
    r"\bassertIsInstance\b", r"\bassert\s+isinstance\b", r"\bassert\s+[\w.\[\]()]+\s+is\s+(?:not\s+)?None\b",
    r"\bassertGreater\(\s*[^,]+,\s*0\s*\)", r"\bassert\s+len\([^)]*\)\s*[<>]=?\s*0\b",
    r"\bassert\s+[\w.\[\]()]+\s*$",  # bare `assert x` (truthy), no comparison
    # C++ gtest
    r"\bEXPECT_TRUE\b", r"\bASSERT_TRUE\b", r"\bEXPECT_FALSE\b", r"\bASSERT_FALSE\b",
    r"\bEXPECT_NE\([^,]+,\s*nullptr", r"\bEXPECT_G[TE]\([^,]+,\s*0\s*\)",
    # go
    r"!=\s*nil\b", r"\bNotNil\b", r"\bNotEmpty\b",
]
# STRONG: exact value or structural-equality assertions that pin behavior precisely.
STRONG = [
    r"\.toBe\(\s*(?!true\b|false\b|null\b|undefined\b|0\s*\))", r"\.toEqual\(", r"\.toStrictEqual\(",
    r"\.toMatchObject\(", r"\.toMatchSnapshot\(", r"\.toBeCloseTo\(",
    r"\.toHaveLength\(\s*[1-9]", r"\.toContain(?:Equal)?\(", r"\.toThrow\(\s*['\"/A-Za-z]",
    r"\.toHaveBeenCalledWith\(", r"\.toBeGreaterThan(?:OrEqual)?\(\s*[1-9]",
    # pytest / unittest exact
    r"\bassertEqual\(", r"\bassertAlmostEqual\(", r"\bassertDictEqual\(", r"\bassertListEqual\(",
    r"\bassertSetEqual\(", r"\bassertTupleEqual\(", r"\bassertRegex\(",
    r"\bassert\s+[\w.\[\]()'\"+\- ]+\s*==\s*\S", r"\bassert\s+[\w.\[\]()]+\s*!=\s*\S",
    r"\bassert\s+[\w.\[\]()]+\s*(?:<=|>=|<|>)\s*[1-9]",
    # C++ gtest exact
    r"\bEXPECT_EQ\(", r"\bASSERT_EQ\(", r"\bEXPECT_DOUBLE_EQ\(", r"\bEXPECT_FLOAT_EQ\(",
    r"\bEXPECT_STREQ\(", r"\bREQUIRE\([^)]*==", r"\bCHECK_EQUAL\(",
    # go
    r"\bassert\.Equal\(", r"\breflect\.DeepEqual\(", r"\bwant\b.*!=.*\bgot\b", r"\bgot\b.*!=.*\bwant\b",
]
WEAK_RE = [re.compile(p) for p in WEAK]
STRONG_RE = [re.compile(p) for p in STRONG]


def reference_test_files(task_dir: Path) -> list[Path]:
    for sub in ("tests/hidden/reference_tests", "tests/hidden"):
        root = task_dir / sub
        if root.exists():
            files = [p for p in root.rglob("*") if p.is_file() and p.suffix in TEST_EXTS
                     and "run_criteria" not in p.name]
            if files:
                return files
    return []


def score_text(text: str) -> tuple[int, int]:
    strong = sum(len(r.findall(text)) for r in STRONG_RE)
    weak = sum(len(r.findall(text)) for r in WEAK_RE)
    return strong, weak


def check_task(task_dir: Path) -> dict:
    files = reference_test_files(task_dir)
    if not files:
        return {"task": task_dir.name, "status": "no-tests"}
    strong = weak = 0
    for f in files:
        try:
            s, w = score_text(f.read_text(errors="ignore"))
        except OSError:
            continue
        strong += s; weak += w
    total = strong + weak
    # No assertions matched at all => our patterns don't cover this test framework
    # (e.g. some C++ harnesses). Report "unparsed" rather than falsely calling it shallow,
    # so this advisory gate never drops a task it simply couldn't read.
    if total == 0:
        return {"task": task_dir.name, "status": "unparsed", "files": len(files)}
    ratio = strong / total
    return {"task": task_dir.name, "status": "ok", "strong": strong, "weak": weak,
            "ratio": round(ratio, 2), "files": len(files)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("tasks", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--min-strong", type=int, default=3, help="min STRONG assertions required")
    ap.add_argument("--min-ratio", type=float, default=0.34, help="min strong/(strong+weak)")
    args = ap.parse_args()

    if args.all:
        dirs = [p for p in GEN.iterdir() if p.is_dir() and (p / "instruction.md").exists()]
    else:
        dirs = [GEN / t for t in args.tasks if (GEN / t).exists()]

    rows = [check_task(d) for d in sorted(dirs)]
    ok = [r for r in rows if r.get("status") == "ok"]

    def shallow(r):
        return r["strong"] < args.min_strong or r["ratio"] < args.min_ratio

    flagged = [r for r in ok if shallow(r)]
    print(f"Checked {len(rows)} task(s). SHALLOW-TESTS flagged: {len(flagged)} "
          f"(min_strong={args.min_strong}, min_ratio={args.min_ratio})\n")
    print(f"  {'task':44} {'strong':>6} {'weak':>5} {'ratio':>6}  verdict")
    for r in sorted(ok, key=lambda x: (x["ratio"], x["strong"])):
        mark = "  <-- SHALLOW (too-easy / gradeability risk)" if shallow(r) else ""
        print(f"  {r['task'][:44]:44} {r['strong']:>6} {r['weak']:>5} {r['ratio']:>6}{mark}")
    other = [r for r in rows if r.get("status") != "ok"]
    if other:
        print("\nnon-scored:", [(r["task"], r["status"]) for r in other])


if __name__ == "__main__":
    main()
