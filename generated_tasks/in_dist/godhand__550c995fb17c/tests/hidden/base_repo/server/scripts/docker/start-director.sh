#!/usr/bin/env bash
set -euo pipefail

SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$SERVER_DIR"

docker compose -f docker-compose.yml -f docker-compose.override.yml up --build "$@"
