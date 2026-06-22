#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ $# -eq 0 ]]; then
  set -- server/tests
fi

if [[ -n "${PYTHON_BIN:-}" ]]; then
  PYTHON_CMD="$PYTHON_BIN"
elif [[ -x "server/.venv/bin/python" ]]; then
  PYTHON_CMD="server/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_CMD="python"
else
  echo "Error: no Python interpreter found." >&2
  exit 1
fi

export PYTHONPATH="${PYTHONPATH:-$ROOT_DIR}"
"$PYTHON_CMD" -m pytest -q "$@"
