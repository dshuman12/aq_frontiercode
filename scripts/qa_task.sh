#!/usr/bin/env bash
# QA gate for in-dist promotion: a task must pass BOTH structure-qa and the full
# (adversarial + rubric) qa before it is eligible for in-dist. Usage:
#   set -a; source .env; set +a
#   ./scripts/qa_task.sh <task-name> [<task-name> ...]
# Exit 0 only if every task passed. Prints a PASS/FAIL line per task.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PYTHONPATH="$ROOT/src${PYTHONPATH:+:$PYTHONPATH}"
PY="${PY:-.venv/bin/python}"
QA_ROOT="${QA_ROOT:-runs/qa}"

overall=0
for t in "$@"; do
  task_dir=""
  for cand in "generated_tasks/$t" "generated_tasks/in_dist/$t"; do
    [ -d "$cand" ] && task_dir="$cand" && break
  done
  if [ -z "$task_dir" ]; then echo "FAIL $t (task dir not found)"; overall=1; continue; fi
  out="$QA_ROOT/$t"; mkdir -p "$out"

  "$PY" -m frontiercode_harness.cli structure-qa --path "$task_dir" --output "$out/structure" \
    > "$out/structure.log" 2>&1
  sc=$?
  if [ $sc -ne 0 ]; then echo "FAIL $t (structure-qa rc=$sc) -> $out/structure.log"; overall=1; continue; fi

  "$PY" -m frontiercode_harness.cli qa --path "$task_dir" --output "$out/full" \
    > "$out/full.log" 2>&1
  fc=$?
  if [ $fc -ne 0 ]; then echo "FAIL $t (full qa rc=$fc) -> $out/full.log"; overall=1; continue; fi

  echo "PASS $t (structure-qa + full qa)"
done
exit $overall
