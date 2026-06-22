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
export MAIN_APP_INCLUDE_GAME_WS="${MAIN_APP_INCLUDE_GAME_WS:-false}"
: "${GAME_SERVER_INTERNAL_TOKEN:?set GAME_SERVER_INTERNAL_TOKEN in server/.env}"

if [[ -n "${GAME_SERVER_SECRET_NA_WEST_1:-}" && -n "${GAME_SERVER_SECRET_NA_WEST_2:-}" && -n "${GAME_SERVER_SECRET_NA_WEST_3:-}" ]]; then
  export GAME_SERVER_CREDENTIALS_JSON="{\"na-west-1\":{\"signing_secret\":\"${GAME_SERVER_SECRET_NA_WEST_1}\",\"allowed_official_keys\":[\"na-west-1\"]},\"na-west-2\":{\"signing_secret\":\"${GAME_SERVER_SECRET_NA_WEST_2}\",\"allowed_official_keys\":[\"na-west-2\"]},\"na-west-3\":{\"signing_secret\":\"${GAME_SERVER_SECRET_NA_WEST_3}\",\"allowed_official_keys\":[\"na-west-3\"]}}"
elif [[ -z "${GAME_SERVER_CREDENTIALS_JSON:-}" ]]; then
  : "${GAME_SERVER_SECRET_NA_WEST_1:?set GAME_SERVER_SECRET_NA_WEST_1 in server/.env}"
  : "${GAME_SERVER_SECRET_NA_WEST_2:?set GAME_SERVER_SECRET_NA_WEST_2 in server/.env}"
  : "${GAME_SERVER_SECRET_NA_WEST_3:?set GAME_SERVER_SECRET_NA_WEST_3 in server/.env}"
fi

exec "$PYTHON_CMD" -m uvicorn server.app:app --host 0.0.0.0 --port 5050 --reload "$@"
