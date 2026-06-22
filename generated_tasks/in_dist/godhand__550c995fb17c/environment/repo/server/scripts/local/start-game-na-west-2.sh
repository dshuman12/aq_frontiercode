#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"
cd "$ROOT_DIR"

if [[ -f "$SERVER_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$SERVER_DIR/.env"
  set +a
fi

if [[ -n "${PYTHON_BIN:-}" ]]; then
  PYTHON_CMD="$PYTHON_BIN"
elif [[ -x "$SERVER_DIR/.venv/bin/python" ]]; then
  PYTHON_CMD="$SERVER_DIR/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_CMD="python"
else
  echo "Error: no Python interpreter found." >&2
  exit 1
fi

export PYTHONPATH="${PYTHONPATH:-$ROOT_DIR}"
export MAIN_APP_INCLUDE_GAME_WS=false
export BACKEND_PUBLIC_BASE_URL="${BACKEND_PUBLIC_BASE_URL:-http://localhost:5050}"
export CHAT_WS_PUBLIC_BASE_URL="${CHAT_WS_PUBLIC_BASE_URL:-http://localhost:5050}"
export CONTROL_PLANE_INTERNAL_BASE_URL="${CONTROL_PLANE_INTERNAL_BASE_URL:-http://localhost:5050}"
export GAME_WS_PUBLIC_BASE_URL="http://localhost:5052"
export GAME_SERVER_SELF_ID="na-west-2"
export GAME_SERVER_SELF_REGION="NA West 2"
export GAME_SERVER_SELF_OFFICIAL_KEYS="na-west-2"
export GAME_SERVER_SELF_SIGNING_SECRET="${GAME_SERVER_SECRET_NA_WEST_2:-}"

: "${GAME_SERVER_INTERNAL_TOKEN:?set GAME_SERVER_INTERNAL_TOKEN in server/.env}"
: "${GAME_SERVER_SELF_SIGNING_SECRET:?set GAME_SERVER_SECRET_NA_WEST_2 in server/.env}"

exec "$PYTHON_CMD" -m uvicorn server.game_server:app --host 0.0.0.0 --port 5052 --reload "$@"
