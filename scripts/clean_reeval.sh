#!/usr/bin/env bash
#
# Clean, ground-truth-aligned re-eval.
#
# FrontierCode ground truth: run a model N times at every available reasoning
# effort, average the metric across the N trials per effort, and report each
# model at its best-performing effort. This wrapper enforces that protocol and
# writes to a FRESH timestamped jobs dir so historical reruns are never pooled
# (the platform de-pools by taking the latest run per model/effort cell).
#
# Usage:
#   scripts/clean_reeval.sh [TASK_NAME ...]
#
#   # all tasks in the dataset:
#   scripts/clean_reeval.sh
#
#   # specific tasks:
#   scripts/clean_reeval.sh durab__metrics-bucket-boundary swarmsync__bully-liveness-scope
#
#   # preview the exact command without spending eval budget:
#   DRY_RUN=1 scripts/clean_reeval.sh
#
# Override defaults via env: DATASET, MODEL, AGENT, TRIALS, EFFORTS, JOBS_DIR, OUTPUT.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DATASET="${DATASET:-generated_tasks}"
MODEL="${MODEL:-openai/gpt-5.5}"   # the frontier solver to calibrate against
AGENT="${AGENT:-codex}"
TRIALS="${TRIALS:-5}"              # ground truth: 5 trials per effort
EFFORTS="${EFFORTS:-low medium high}"
N_CONCURRENT="${N_CONCURRENT:-2}"  # cap concurrent trials -> avoid Docker 'compose up' saturation
STAMP="$(date +%Y-%m-%d__%H-%M-%S)"
JOBS_DIR="${JOBS_DIR:-runs/clean-$STAMP}"     # fresh dir -> no rerun pooling
OUTPUT="${OUTPUT:-$JOBS_DIR/frontiercode-report}"

effort_args=()
for e in $EFFORTS; do effort_args+=(--reasoning-effort "$e"); done

task_args=()
for t in "$@"; do task_args+=(--include-task-name "$t"); done

echo "[clean_reeval] model=$MODEL agent=$AGENT trials=$TRIALS efforts=[$EFFORTS]"
echo "[clean_reeval] dataset=$DATASET"
echo "[clean_reeval] jobs_dir=$JOBS_DIR"
echo "[clean_reeval] tasks=${*:-<all in dataset>}"

cmd=(python3 -m frontiercode_harness eval
  --path "$DATASET"
  --agent "$AGENT"
  --model "$MODEL"
  "${effort_args[@]}"
  --trials "$TRIALS"
  --n-concurrent "$N_CONCURRENT"
  --jobs-dir "$JOBS_DIR"
  --output "$OUTPUT")
if ((${#task_args[@]})); then
  cmd+=("${task_args[@]}")
fi

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "[clean_reeval] DRY RUN — would execute:"
  echo -n "  PYTHONPATH=src"
  printf ' %q' "${cmd[@]}"
  echo
  exit 0
fi

PYTHONPATH=src "${cmd[@]}"
echo "[clean_reeval] report written to: $OUTPUT"
