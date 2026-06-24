#!/usr/bin/env bash
# Regenerate a Go task's golden reference.patch against the gofmt-canonical base.
# Old patch is whitespace-fuzzy applied to the canonical base, re-gofmt'd, then
# re-diffed so the new patch applies STRICTLY. Verifies strict apply before swap.
# Usage: scripts/regen_reference_patch.sh <task-name> [...]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${IMAGE:-golang:1.24-bookworm}"

INNER='
set -eu
for t in "$@"; do
  td="generated_tasks/$t"
  base="$td/tests/hidden/base_repo"
  ref="$td/tests/grader/calibration/reference.patch"
  [ -d "$base" ] && [ -f "$ref" ] || { echo "$t: SKIP (missing base/ref)"; continue; }
  w=$(mktemp -d)
  cp -R "$base" "$w/base"
  cp -R "$base" "$w/fixed"
  ( cd "$w/fixed" && git apply --ignore-whitespace -p1 "/work/$ref" ) 2>/dev/null \
    || { echo "$t: OLD_PATCH_APPLY_FAIL"; rm -rf "$w"; continue; }
  gofmt -w "$w/fixed" 2>/dev/null || true
  ( cd "$w" && git diff --no-index base fixed 2>/dev/null | sed -E "s#a/base/#a/#g; s#b/fixed/#b/#g" > "$w/new.patch" ) || true
  if [ ! -s "$w/new.patch" ]; then echo "$t: EMPTY_NEW_PATCH"; rm -rf "$w"; continue; fi
  # verify strict apply of the NEW patch onto a fresh canonical base
  cp -R "$base" "$w/verify"
  if ( cd "$w/verify" && git apply -p1 "$w/new.patch" ) 2>/dev/null; then
    cp "$w/new.patch" "/work/$ref"
    echo "$t: REGEN_OK ($(grep -c "^diff --git" "$w/new.patch") files, strict-apply verified)"
  else
    echo "$t: STRICT_APPLY_FAIL (left original patch in place)"
  fi
  rm -rf "$w"
done'
docker run --rm -v "$ROOT:/work" -w /work "$IMAGE" bash -c "$INNER" bash "$@"
