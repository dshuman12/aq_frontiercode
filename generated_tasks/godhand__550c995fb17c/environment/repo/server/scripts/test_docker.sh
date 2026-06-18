#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ $# -eq 0 ]]; then
  set -- server/tests
fi

COMPOSE_ARGS=(-f server/docker-compose.yml -f server/docker-compose.override.yml)

if ! docker compose "${COMPOSE_ARGS[@]}" ps --services --status running | grep -qx "api"; then
  echo "Error: api container is not running." >&2
  echo "Start it first with: cd server && docker compose up --build" >&2
  exit 1
fi

docker compose "${COMPOSE_ARGS[@]}" exec -T api python -m pytest -q "$@"
