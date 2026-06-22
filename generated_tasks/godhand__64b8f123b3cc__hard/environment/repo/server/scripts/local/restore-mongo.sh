#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-archive-path> [--drop]"
  exit 1
fi

ARCHIVE_PATH="$1"
DROP_FLAG="${2:-}"

if [[ ! -f "$ARCHIVE_PATH" ]]; then
  echo "Backup archive not found: $ARCHIVE_PATH"
  exit 1
fi

RESTORE_CMD=(mongorestore --archive --gzip)
if [[ "$DROP_FLAG" == "--drop" ]]; then
  RESTORE_CMD+=(--drop)
fi

echo "Restoring Mongo from: $ARCHIVE_PATH"
cat "$ARCHIVE_PATH" | docker-compose -f "$SERVER_DIR/docker-compose.yml" -f "$SERVER_DIR/docker-compose.override.yml" exec -T mongo "${RESTORE_CMD[@]}"
echo "Restore complete."
