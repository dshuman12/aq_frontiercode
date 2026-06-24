#!/usr/bin/env python3
"""Batch-generate FrontierCode tasks from the gradeability-vetted shortlist.

Reads generated_task_candidates/csv_gradeable.csv (output of gradeability_triage.py),
keeps GRADEABLE rows, maps each back to its row number in the main CSV, and runs the
generator (skip-qa) for each. Designed to feed the next stage: 1-trial probe -> clean_reeval.

Usage:
  python3 scripts/batch_generate.py --top 15 [--lang JS/TS,Python] [--dry-run]
  # then: ./scripts/clean_reeval.sh <task_id> ... (probe), then full 5x3
"""
from __future__ import annotations

import argparse
import csv
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN_CSV = ROOT / "FrontierCode Sample - Potential Tasks.csv"
GRADEABLE = ROOT / "generated_task_candidates" / "csv_gradeable.csv"
INSTRUCTION_MODEL = "anthropic/claude-opus-4.8"  # default is invalid; this is the correct id

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="src", type=Path, default=GRADEABLE,
                    help="candidate CSV (default csv_gradeable.csv; pass ready_batch.csv for buildable-only)")
    ap.add_argument("--top", type=int, default=15)
    ap.add_argument("--lang", default="", help="comma list to keep, e.g. 'Python,JS/TS'")
    ap.add_argument("--verdict", default="GRADEABLE", help="comma list of triage verdicts to include")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    keep_langs = {x.strip() for x in args.lang.split(",") if x.strip()}
    keep_verdicts = {x.strip() for x in args.verdict.split(",") if x.strip()}

    main_rows = list(csv.DictReader(open(MAIN_CSV)))
    rownum = {r["Task ID"]: i for i, r in enumerate(main_rows, 1)}
    cand = [r for r in csv.DictReader(open(args.src))
            if r["verdict"] in keep_verdicts and (not keep_langs or r["lang"] in keep_langs)]
    cand = cand[: args.top]

    print(f"Batch: {len(cand)} candidate(s) (verdict={keep_verdicts}, lang={keep_langs or 'any'})")
    generated, failed, task_ids = [], [], []
    for c in cand:
        row = rownum.get(c["task_id"])
        if not row:
            failed.append((c["task_id"], "not in main CSV")); continue
        print(f"  -> row#{row} {c['task_id']} [{c['lang']}] score={c['score']}")
        if args.dry_run:
            task_ids.append(c["task_id"]); continue
        cmd = [sys.executable, str(ROOT / "scripts" / "generate_frontiercode_task.py"),
               "--rows-csv", str(MAIN_CSV), "--row-number", str(row), "--limit", "1",
               "--instruction-model", INSTRUCTION_MODEL, "--skip-qa", "--force"]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0:
            generated.append(c["task_id"]); task_ids.append(c["task_id"])
        else:
            failed.append((c["task_id"], r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "error"))
            print(f"     FAILED: {failed[-1][1][:120]}")

    print(f"\nGenerated {len(generated)}  failed {len(failed)}")
    for tid, why in failed:
        print(f"  FAIL {tid}: {why[:100]}")
    if task_ids:
        print("\nProbe next (1 trial, drop easy):")
        print(f"  TRIALS=1 EFFORTS=high ./scripts/clean_reeval.sh {' '.join(task_ids)}")

if __name__ == "__main__":
    main()
