#!/usr/bin/env bash
set -euo pipefail

SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$SERVER_DIR"

if [[ ! -f ".env" ]]; then
  echo "Error: server/.env not found." >&2
  exit 1
fi

set -a
source ".env"
set +a

BASE_URL="${BACKEND_PUBLIC_BASE_URL:-http://localhost:5050}"
TOKEN="${DEV_ADMIN_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "Error: DEV_ADMIN_TOKEN must be set in server/.env" >&2
  exit 1
fi

usage() {
  cat <<'EOF'
Usage:
  ./server/scripts/local/dev-reset.sh lobby <lobby_id> [regenerate|reset] [--clear-population]
  ./server/scripts/local/dev-reset.sh server <game_server_id> [--clear-population]

Examples:
  ./server/scripts/local/dev-reset.sh lobby 67f4... regenerate
  ./server/scripts/local/dev-reset.sh lobby 67f4... reset --clear-population
  ./server/scripts/local/dev-reset.sh server na-west-1
EOF
}

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

TARGET_TYPE="$1"
TARGET_ID="$2"
shift 2

CLEAR_POPULATION="false"
for arg in "$@"; do
  if [[ "$arg" == "--clear-population" ]]; then
    CLEAR_POPULATION="true"
  fi
done

if [[ "$TARGET_TYPE" == "lobby" ]]; then
  MODE="regenerate_world"
  if [[ $# -ge 1 && "$1" != "--clear-population" ]]; then
    if [[ "$1" == "regenerate" ]]; then
      MODE="regenerate_world"
    elif [[ "$1" == "reset" ]]; then
      MODE="reset_lobby"
    else
      echo "Error: lobby mode must be 'regenerate' or 'reset'." >&2
      exit 1
    fi
  fi

  curl --fail --show-error --silent \
    -X POST \
    -H "Content-Type: application/json" \
    -H "X-Dev-Admin-Token: ${TOKEN}" \
    -d "{\"mode\":\"${MODE}\",\"clearPopulation\":${CLEAR_POPULATION},\"disconnectReason\":\"Developer reset via local script.\"}" \
    "${BASE_URL}/api/v1/internal/developer/lobbies/${TARGET_ID}/reset"
  echo
  exit 0
fi

if [[ "$TARGET_TYPE" == "server" ]]; then
  curl --fail --show-error --silent \
    -X POST \
    -H "Content-Type: application/json" \
    -H "X-Dev-Admin-Token: ${TOKEN}" \
    -d "{\"clearPopulation\":${CLEAR_POPULATION},\"disconnectReason\":\"Developer reset via local script.\"}" \
    "${BASE_URL}/api/v1/internal/developer/game-servers/${TARGET_ID}/reset"
  echo
  exit 0
fi

usage
exit 1
