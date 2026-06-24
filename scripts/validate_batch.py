#!/usr/bin/env python3
"""One-command batch validator + mass generator.

Chains every gate so a single run turns the CSV pool into validated, ready-to-calibrate tasks:
  rank -> gradeability_triage -> buildability_check -> generate(+QA optional) -> instruction-consistency
Outputs generated_task_candidates/validated_tasks.csv and prints the clean_reeval command.

Usage:
  python3 scripts/validate_batch.py --top 100                 # all available, ranked
  python3 scripts/validate_batch.py --lang Python --top 100
  python3 scripts/validate_batch.py --qa                      # run generation QA too (slower)
  python3 scripts/validate_batch.py --skip-build              # trust prior buildable.csv (faster reruns)
"""
from __future__ import annotations

import argparse
import csv
import importlib.util
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN_CSV = ROOT / "FrontierCode Sample - Potential Tasks.csv"
CAND = ROOT / "generated_task_candidates"
INSTR_MODEL = "anthropic/claude-opus-4.8"  # generator default is invalid; this is the valid id

def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / file)
    m = importlib.util.module_from_spec(spec)
    sys.modules[name] = m
    spec.loader.exec_module(m)
    return m

icc = _load("iccmod", "instruction_consistency_check.py")  # pure functions, safe to import

def run(cmd):
    print("   $ " + " ".join(str(c) for c in cmd))
    return subprocess.run(cmd, cwd=ROOT)

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=100)
    ap.add_argument("--lang", default="")
    ap.add_argument("--qa", action="store_true", help="run generation QA (adversarial+rubric, slower)")
    ap.add_argument("--skip-build", action="store_true", help="reuse existing buildable.csv")
    ap.add_argument("--topic-threshold", type=float, default=0.5)
    args = ap.parse_args()
    py = sys.executable

    # Stage 1: gradeability (rank + diff-level source check) -> csv_gradeable.csv
    print("== Stage 1: rank + gradeability_triage ==")
    cmd = [py, "scripts/gradeability_triage.py", "--limit", str(args.top)]
    if args.lang:
        cmd += ["--lang", args.lang]
    run(cmd)
    gradeable = [r for r in csv.DictReader(open(CAND / "csv_gradeable.csv")) if r["verdict"] == "GRADEABLE"]
    print(f"   gradeable candidates: {len(gradeable)}")

    # Stage 2: buildability (docker build per repo) -> buildable.csv
    if not args.skip_build:
        print("== Stage 2: buildability_check (docker build per repo) ==")
        run([py, "scripts/buildability_check.py", "--from", str(CAND / "csv_gradeable.csv")])
    buildable_repos = {r["repo"] for r in csv.DictReader(open(CAND / "buildable.csv")) if r["buildable"] == "yes"}
    ready = [r for r in gradeable if r["repo"] in buildable_repos]
    print(f"   gradeable AND buildable: {len(ready)}")

    # Stage 3: generate (with or without QA)
    print(f"== Stage 3: generate {len(ready)} tasks ({'WITH' if args.qa else 'NO'} QA) ==")
    rownum = {r["Task ID"]: i for i, r in enumerate(csv.DictReader(open(MAIN_CSV)), 1)}
    generated = []
    for r in ready:
        row = rownum.get(r["task_id"])
        if not row:
            continue
        cmd = [py, "scripts/generate_frontiercode_task.py", "--rows-csv", str(MAIN_CSV),
               "--row-number", str(row), "--limit", "1", "--instruction-model", INSTR_MODEL, "--force"]
        if not args.qa:
            cmd.append("--skip-qa")
        res = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        if res.returncode == 0:
            generated.append(r)
        else:
            tail = res.stderr.strip().splitlines()[-1] if res.stderr.strip() else "error"
            print(f"   gen FAIL {r['task_id']}: {tail[:100]}")
    print(f"   generated: {len(generated)}/{len(ready)}")

    # Stage 4: instruction <-> hidden-test consistency
    print("== Stage 4: instruction_consistency_check ==")
    validated, dropped = [], []
    for r in generated:
        res = icc.check_task(ROOT / "generated_tasks" / r["task_id"])
        cov = res.get("topic_cov", 1.0) if res.get("status") == "ok" else None
        if cov is not None and cov < args.topic_threshold:
            dropped.append((r["task_id"], cov, res.get("topics_missing", [])))
        else:
            validated.append((r["task_id"], r["lang"], r["score"], cov))
    for tid, cov, miss in dropped:
        print(f"   MIS-GEN drop {tid}: topic_cov={cov} missing={miss[:4]}")
    print(f"   validated: {len(validated)}/{len(generated)}")

    out = CAND / "validated_tasks.csv"
    with open(out, "w", newline="") as f:
        w = csv.writer(f); w.writerow(["task_id", "lang", "score", "topic_cov"])
        w.writerows(validated)
    print(f"\n== VALIDATED {len(validated)} tasks -> {out.relative_to(ROOT)} ==")
    if validated:
        ids = " ".join(t[0] for t in validated)
        print(f"\nCalibrate (5 trials/effort):\n  TRIALS=5 ./scripts/clean_reeval.sh {ids}")

if __name__ == "__main__":
    main()
