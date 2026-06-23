#!/usr/bin/env sh
set -eu

task_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repo="$task_root/environment/repo"

python3 "$task_root/tests/hidden/run_criteria.py" "$repo"

