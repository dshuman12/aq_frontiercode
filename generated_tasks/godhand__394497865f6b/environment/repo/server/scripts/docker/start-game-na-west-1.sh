#!/usr/bin/env bash
set -euo pipefail

SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$SERVER_DIR"

docker compose -f docker-compose.game-servers.yml -f docker-compose.game-servers.override.yml up --build game_na_west_1 "$@"
