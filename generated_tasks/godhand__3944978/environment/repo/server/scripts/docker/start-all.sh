#!/usr/bin/env bash
set -euo pipefail

SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$SERVER_DIR"

docker compose -f docker-compose.all.yml -f docker-compose.all.override.yml up --build "$@"
