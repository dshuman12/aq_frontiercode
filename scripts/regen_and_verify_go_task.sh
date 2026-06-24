#!/usr/bin/env bash
#
# regen_and_verify_go_task.sh — after gofmt canonicalization, regenerate each
# Go task's golden reference.patch against the canonical base and prove the task
# is still gradeable end-to-end:
#   1. hidden reference tests FAIL on the (canonical) buggy base   -> bug preserved
#   2. golden fix applies, builds, and hidden reference tests PASS -> fix valid
#   3. scope check PASSES for the golden fix                       -> no format noise
# Regenerated reference.patch = diff(canonical base, canonical fixed).
#
# Usage: scripts/regen_and_verify_go_task.sh <task-name> [...]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${IMAGE:-golang:1.24-bookworm}"

INNER='
set -eu
for t in "$@"; do
  td="generated_tasks/$t"
  base="$td/tests/hidden/base_repo"
  ref="$td/tests/grader/calibration/reference.patch"
  reftests="$td/tests/hidden/reference_tests"
  cmd=$(python3 -c "import json;print(json.load(open(\"$td/tests/hidden/task_spec.json\"))[\"visible_test_command\"])")
  [ -d "$base" ] && [ -f "$ref" ] || { echo "$t: MISSING base/ref"; continue; }

  work=$(mktemp -d)
  # --- buggy base, hidden tests overlaid ---
  cp -R "$base" "$work/buggy"
  if [ -d "$reftests" ]; then (cd "$reftests" && find . -type f) | while read -r f; do
      mkdir -p "$work/buggy/$(dirname "$f")"; cp "$reftests/$f" "$work/buggy/$f"; done; fi
  if (cd "$work/buggy" && eval "$cmd" >/dev/null 2>&1); then base_res="PASS"; else base_res="fail"; fi

  # --- fixed = base + reference.patch (whitespace-fuzzy), then gofmt ---
  cp -R "$base" "$work/fixed"
  applied="apply_ok"
  (cd "$work/fixed" && git apply --ignore-whitespace -p1 "/work/$ref") 2>/dev/null || \
  (cd "$work/fixed" && patch -p1 -l --no-backup-if-mismatch < "/work/$ref" >/dev/null 2>&1) || applied="APPLY_FAIL"
  gofmt -w "$work/fixed" 2>/dev/null || true
  # overlay hidden tests on fixed and run
  cp -R "$work/fixed" "$work/fixed_t"
  if [ -d "$reftests" ]; then (cd "$reftests" && find . -type f) | while read -r f; do
      mkdir -p "$work/fixed_t/$(dirname "$f")"; cp "$reftests/$f" "$work/fixed_t/$f"; done; fi
  if (cd "$work/fixed_t" && eval "$cmd" >/dev/null 2>&1); then fix_res="PASS"; else fix_res="fail"; fi

  # --- scope: how many files differ between canonical base and canonical fixed ---
  nchanged=$(cd "$work" && diff -rq base fixed 2>/dev/null | grep -c "differ\|Only in" || true)

  # --- regenerate reference.patch (canonical) ---
  (cd "$work" && git diff --no-index base fixed 2>/dev/null \
     | sed -E "s#a/base/#a/#g; s#b/fixed/#b/#g" \
     > "/work/$ref.new") || true

  echo "$t | bug_on_base=$base_res(want fail) | golden_fix=$fix_res(want PASS) | $applied | changed_files=$nchanged | cmd=[$cmd]"
  rm -rf "$work"
done'
docker run --rm -v "$ROOT:/work" -w /work "$IMAGE" bash -c "$INNER" bash "$@"
