#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"

OUT_DIR="${1:-$SERVER_DIR/backups}"
mkdir -p "$OUT_DIR"

TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
ARCHIVE_PATH="$OUT_DIR/mongo-backup-$TIMESTAMP.archive.gz"

echo "Creating Mongo backup at: $ARCHIVE_PATH"
docker-compose -f "$SERVER_DIR/docker-compose.yml" -f "$SERVER_DIR/docker-compose.override.yml" exec -T mongo \
  mongodump --archive --gzip > "$ARCHIVE_PATH"

echo "Backup complete: $ARCHIVE_PATH"
