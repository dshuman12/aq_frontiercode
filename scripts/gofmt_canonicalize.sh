#!/usr/bin/env bash
#
# gofmt_canonicalize.sh — fix scope-blocker noise in Go FrontierCode tasks.
#
# Handcrafted Go tasks were written with non-gofmt-canonical formatting. When a
# solving agent runs `gofmt`/`go fmt`/`go build`, every file re-aligns, so the
# byte-exact scope check (run_criteria.py:changed_files) sees the whole repo as
# "changed" and the scope_matches_reference_intent blocker fails -> task scores 0
# even when the actual bug fix and hidden tests pass.
#
# This canonicalizes the stored snapshots so the agent's gofmt becomes a no-op
# and only real logic changes register. It rewrites, for each task:
#   environment/repo, tests/hidden/base_repo, tests/hidden/reference_tests
# using gofmt from the SAME image the task builds with (golang:1.24-bookworm),
# so formatting matches what the agent's container produces exactly.
#
# Usage: scripts/gofmt_canonicalize.sh <task-name> [<task-name> ...]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${IMAGE:-golang:1.24-bookworm}"

[ "$#" -ge 1 ] || { echo "usage: $0 <task-name> [...]"; exit 2; }

# Validate task dirs up front.
tasks=()
for t in "$@"; do
  if [ -d "$ROOT/generated_tasks/$t/environment/repo" ]; then
    tasks+=("$t")
  else
    echo "[skip] $t — no generated_tasks/$t/environment/repo"
  fi
done
[ "${#tasks[@]}" -ge 1 ] || { echo "no valid tasks"; exit 1; }

INNER='
set -eu
for t in "$@"; do
  td="generated_tasks/$t"
  for sub in environment/repo tests/hidden/base_repo tests/hidden/reference_tests; do
    d="$td/$sub"
    [ -d "$d" ] || continue
    n_before=$(cd "$d" && gofmt -l . 2>/dev/null | wc -l | tr -d " ")
    gofmt -w "$d"
    n_after=$(cd "$d" && gofmt -l . 2>/dev/null | wc -l | tr -d " ")
    echo "  $t/$sub: gofmt-noncanonical $n_before -> $n_after"
  done
done'
docker run --rm -v "$ROOT:/work" -w /work "$IMAGE" bash -c "$INNER" bash "${tasks[@]}"

# Post-checks on the host: base_repo must stay byte-identical to environment/repo.
echo "=== verification ==="
for t in "${tasks[@]}"; do
  td="$ROOT/generated_tasks/$t"
  if [ -d "$td/tests/hidden/base_repo" ]; then
    if diff -rq "$td/environment/repo" "$td/tests/hidden/base_repo" >/dev/null 2>&1; then
      echo "  [ok]   $t — environment/repo == base_repo"
    else
      echo "  [WARN] $t — environment/repo != base_repo (inspect)"
    fi
  fi
done
