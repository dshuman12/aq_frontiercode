#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

pids=()
cleanup() {
  for pid in "${pids[@]:-}"; do
    kill "$pid" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT INT TERM

"$SCRIPT_DIR/start-director.sh" "$@" &
pids+=("$!")
"$SCRIPT_DIR/start-game-na-west-1.sh" "$@" &
pids+=("$!")
"$SCRIPT_DIR/start-game-na-west-2.sh" "$@" &
pids+=("$!")
"$SCRIPT_DIR/start-game-na-west-3.sh" "$@" &
pids+=("$!")

exit_code=0
for pid in "${pids[@]}"; do
  if ! wait "$pid"; then
    exit_code=1
  fi
done

exit "$exit_code"
