#!/usr/bin/env bash
#
# triage_python_batch.sh — conc-1 triage of the ranked Python real-commit
# candidates to find/confirm in-band (1-4/5) tasks. RUN ONLY WHEN DOCKER IS FREE
# (other Docker load deflates trials into RuntimeError -> fake 0/5 readings).
#
# It pre-builds each task image (warms the cache, kills the build-race) then runs
# a clean conc-1 / 5-trial / high-effort eval, and prints the pass rate.
#
# Usage: scripts/triage_python_batch.sh [task ...]   (defaults to the queue below)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; cd "$ROOT"

# Priority queue (most promising first). Pooled-run signal in comments.
QUEUE=(
  cryograph__22291410b572        # 7/14 pooled -> CONFIRM in-band, then promote
  flowq__3c93af722e83            # 1/13 pooled -> maybe in-band
  flowq__59b178e66304            # 1/9  pooled -> maybe in-band
  bynaus-ai-companion__4134a2fc1079  # fresh
  bynaus-ai-companion__e23adf2c631c  # fresh
)
[ "$#" -gt 0 ] && QUEUE=("$@")

# .env gives EVAL_API_KEY/QA_API_KEY; shim makes `python3` = 3.12 (tomllib).
set -a; . ./.env; set +a
mkdir -p /tmp/pyshim; ln -sf "$(command -v python3.12 || echo /opt/homebrew/bin/python3.12)" /tmp/pyshim/python3
export PATH="/tmp/pyshim:$PATH"

for t in "${QUEUE[@]}"; do
  td="generated_tasks/$t"
  [ -d "$td" ] || { echo "[skip] $t (not found)"; continue; }
  echo "==== $t ===="
  echo "  pre-building image..."
  docker build -q -t "prebuild-$t" "$td/environment/" >/dev/null 2>&1 || echo "  (build warning)"
  STAMP=$(date +%Y-%m-%d__%H-%M-%S); JD="runs/triage-$t-$STAMP"
  PYTHONPATH=src python3 -m frontiercode_harness eval \
    --path generated_tasks --agent codex --model openai/gpt-5.5 \
    --reasoning-effort high --trials 5 --n-concurrent 1 \
    --jobs-dir "$JD" --output "$JD/frontiercode-report" \
    --include-task-name "$t" 2>&1 | grep -iE 'Trial finished|Pass rate|Errored' || true
  # pass rate
  p=0; n=0
  for r in $(find "$JD" -name frontiercode_result.json 2>/dev/null); do
    v=$(python3 -c "import json;print(1 if json.load(open('$r')).get('pass') else 0)" 2>/dev/null || echo 0)
    n=$((n+1)); p=$((p+v))
  done
  band="too-easy"; [ "$p" = 0 ] && band="too-hard/broken"; { [ "$p" -gt 0 ] && [ "$p" -lt "$n" ]; } && band="IN-BAND ✅"
  echo "  ==> $t: $p/$n  [$band]"
done
echo "Done. Promote IN-BAND tasks to generated_tasks/in_dist/ ; move 5/5 and 0/5 to in_progress/."
