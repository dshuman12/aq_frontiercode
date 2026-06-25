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
import collections
import csv
import glob
import importlib.util
import json
import os
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
    ap.add_argument("--calibrate", type=int, default=0, metavar="N",
                    help="Stage 5 difficulty gate: calibrate N trials @ high effort and keep ONLY "
                         "in-band tasks (0<pass<1); drop too-easy (N/N) and broken/too-hard (0/N). "
                         "Docker-heavy. The reliable difficulty filter -- static heuristics are not.")
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
        cov = res.get("topic_cov", 1.0) if res.get("status") == "ok" else 1.0
        req_missing = res.get("req_missing", []) if res.get("status") == "ok" else []
        # mis-gen if topics absent OR the test needs fix-introduced symbols the instruction omits
        if cov < args.topic_threshold:
            dropped.append((r["task_id"], f"topic_cov={cov}", res.get("topics_missing", [])[:4]))
        elif req_missing:
            dropped.append((r["task_id"], "missing-symbols", req_missing[:4]))
        else:
            validated.append((r["task_id"], r["lang"], r["score"], cov))
    for tid, why, miss in dropped:
        print(f"   MIS-GEN drop {tid}: {why} {miss}")
    print(f"   consistent: {len(validated)}/{len(generated)}")

    # Stage 5 (optional, the RELIABLE difficulty filter): calibrate and keep only in-band.
    # Static signals (patch size, test-strength) do NOT predict difficulty -- only execution does.
    if args.calibrate and validated:
        n = args.calibrate
        print(f"== Stage 5: difficulty gate (calibrate {n} trials @ high; drop too-easy + broken) ==")
        ids = [t[0] for t in validated]
        jobs = ROOT / "runs" / "difficulty-gate"
        env = dict(os.environ, TRIALS=str(n), EFFORTS="high", N_CONCURRENT="2",
                   JOBS_DIR=str(jobs), OUTPUT=str(jobs / "report"))
        subprocess.run(["bash", "scripts/clean_reeval.sh", *ids], cwd=ROOT, env=env)
        agg = collections.defaultdict(lambda: [0, 0])  # task -> [passes, trials]
        for f in glob.glob(str(jobs / "**/verifier/frontiercode_result.json"), recursive=True):
            try:
                d = json.load(open(f))
            except (OSError, ValueError):
                continue
            a = agg[d.get("task_id", "")]; a[1] += 1; a[0] += 1 if d.get("pass") else 0
        in_band, too_easy, broken = [], [], []
        for t in validated:
            p, tot = agg.get(t[0], [0, 0])
            pr = p / tot if tot else 0.0
            if tot == 0 or pr == 0:
                broken.append((t[0], f"{p}/{tot}"))
            elif pr >= 1:
                too_easy.append((t[0], f"{p}/{tot}"))
            else:
                in_band.append(t)
        for tid, pr in too_easy:
            print(f"   DROP too-easy   {tid}: {pr}")
        for tid, pr in broken:
            print(f"   DROP broken/hard {tid}: {pr}  (gradeability/infra/mis-gen or Diamond-tier; inspect)")
        print(f"   IN-BAND: {len(in_band)}/{len(validated)}")
        validated = in_band

    out = CAND / "validated_tasks.csv"
    with open(out, "w", newline="") as f:
        w = csv.writer(f); w.writerow(["task_id", "lang", "score", "topic_cov"])
        w.writerows(validated)
    label = "VALIDATED (in-band confirmed)" if args.calibrate else "CONSISTENT (difficulty UNVERIFIED)"
    print(f"\n== {label}: {len(validated)} tasks -> {out.relative_to(ROOT)} ==")
    if validated:
        ids = " ".join(t[0] for t in validated)
        if args.calibrate:
            print(f"\nFull calibration (5 trials/effort) before promotion:\n  TRIALS=5 ./scripts/clean_reeval.sh {ids}")
        else:
            print("\nThese passed structure/consistency but difficulty is NOT verified -- many will be too-easy.")
            print(f"Re-run with the difficulty gate to keep only in-band:\n  {sys.argv[0]} ... --calibrate 3")

if __name__ == "__main__":
    main()
