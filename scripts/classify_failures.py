#!/usr/bin/env python3
"""Failure-mode classifier for calibration results.

A task at 0/5 can be a genuinely-hard Diamond keeper OR a mis-generated/broken task -- the
pass rate can't tell them apart, only the failure text can. This reads the hidden-test output
of each task's trials and labels it, so 0/5 verdicts are automatic instead of hand-read.

Verdicts:
  IN-BAND      0<pass<1                        -> keeper (Main/in-band)
  TOO-EASY     pass>=1                          -> drop
  HARD-KEEPER  0/5, real assertion/value fail   -> keeper (Diamond-tier, the model near-misses)
  MIS-GEN      0/5, structural mismatch (wrong signature/symbol/topic) -> fix instruction or drop
  GRADEABILITY 0/5, visible tests pass on base  -> task doesn't capture the bug
  INFRA        0/5, can't build/run (dep/env)   -> fix environment

Usage:
  python3 scripts/classify_failures.py --runs runs/cal-clean
  python3 scripts/classify_failures.py --eval                 # re-triage generated_tasks/_eval
"""
from __future__ import annotations

import argparse
import collections
import glob
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# checked in priority order; first match wins
PATTERNS = [
    ("NO-TESTS-COLLECTED", [r"exit(?:ed)? 5\b", r"collected 0 items", r"no tests ran",
                            r"No tests were found"]),
    ("INFRA", [r"exit(?:ed)? 127", r"command not found", r"JAVA_HOME", r"bun: not found",
               r"No module named '[^']+'", r"Cannot find module", r"gradlew", r"go: cannot find"]),
    ("GRADEABILITY", [r"passed on the broken base snapshot"]),
    ("MIS-GEN", [r"cannot import name", r"Expected \d+ arguments?, but got \d+", r"has no attribute",
                 r"is not a function", r"is not defined", r"AttributeError", r"NameError",
                 r"TS2554", r"Property '[^']+' does not exist", r"ImportError: cannot import",
                 r"ERROR collecting"]),
    ("HARD-KEEPER", [r"AssertionError", r"\d+ failed[, ]+\d+ passed", r"\d+ passed[, ]+\d+ failed",
                     r"expect\(", r"toBe\b", r"toEqual\b", r"to (?:be|equal|contain)", r"Expected .*Received"]),
]

def classify_text(text: str) -> tuple[str, str]:
    for label, pats in PATTERNS:
        for p in pats:
            m = re.search(p, text, re.I)
            if m:
                ev = text[max(0, m.start() - 20): m.start() + 60].replace("\n", " ").strip()
                return label, ev
    return "UNKNOWN", text[:60].replace("\n", " ")

def failing_text(trial: dict) -> str:
    out = []
    for c in trial.get("criteria_results", []):
        if c.get("passed"):
            continue
        if c["criterion_id"] in ("hidden_reference_tests_pass", "visible_regression_tests_pass",
                                 "submitted_tests_fail_on_base"):
            out.append(c.get("details", "") or "")
    return "\n".join(out)

def load_tasks(args) -> dict:
    tasks = collections.defaultdict(list)  # task -> [trial dicts]
    if args.eval:
        for f in glob.glob(str(ROOT / "generated_tasks/_eval/*/frontiercode_results.json")):
            for t in json.load(open(f)):
                tasks[t.get("task_id", Path(f).parent.name)].append(t)
    else:
        for f in glob.glob(str(ROOT / args.runs / "**/verifier/frontiercode_result.json"), recursive=True):
            t = json.load(open(f))
            tasks[t.get("task_id", "?")].append(t)
    return tasks

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", default="runs/cal-clean")
    ap.add_argument("--eval", action="store_true")
    args = ap.parse_args()
    tasks = load_tasks(args)

    rows = []
    for task, trials in sorted(tasks.items()):
        n = len(trials)
        npass = sum(1 for t in trials if t.get("pass"))
        pr = npass / n if n else 0
        if pr >= 1:
            verdict, ev = "TOO-EASY", ""
        elif pr > 0:
            verdict, ev = "IN-BAND", ""
        else:
            # 0/N: classify the failure across trials, take the most common label
            labels = [classify_text(failing_text(t)) for t in trials if not t.get("pass")]
            counts = collections.Counter(l for l, _ in labels)
            verdict = counts.most_common(1)[0][0] if counts else "UNKNOWN"
            ev = next((e for l, e in labels if l == verdict), "")
        rows.append((task, f"{npass}/{n}", verdict, ev))

    KEEP = {"IN-BAND", "HARD-KEEPER"}
    print(f"  {'task':42} {'pass':>5} {'verdict':13}  evidence")
    for task, pr, verdict, ev in sorted(rows, key=lambda r: r[2]):
        mark = " *KEEP" if verdict in KEEP else ""
        print(f"  {task[:42]:42} {pr:>5} {verdict:13}  {ev[:60]}{mark}")
    summary = collections.Counter(v for _, _, v, _ in rows)
    keepers = [r[0] for r in rows if r[2] in KEEP]
    print(f"\nverdicts: {dict(summary)}")
    print(f"KEEPERS (in-band + hard): {len(keepers)}")
    for k in keepers:
        print("   ", k)

if __name__ == "__main__":
    main()
