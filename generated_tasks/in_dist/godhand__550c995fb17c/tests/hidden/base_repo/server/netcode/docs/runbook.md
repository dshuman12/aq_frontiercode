# Netcode Runbook

## Prerequisites
- Python 3.11+
- Backend dependencies installed (`server/requirements.txt`)

## Run (from `server/`)
```bash
cd server
python -m netcode
```

Alternative:
```bash
cd server
uvicorn netcode.app:app --host 0.0.0.0 --port 8765 --reload
```

## Required Environment Variables (production)
- `NETCODE_AUTH_SECRET`
- `NETCODE_ADMIN_API_KEY`

## Useful Optional Environment Variables
- `NETCODE_HOST` (default `0.0.0.0`)
- `NETCODE_PORT` (default `8765`)
- `NETCODE_TICK_RATE_HZ` (default `20`)
- `NETCODE_SNAPSHOT_RATE_HZ` (default `10`)
- `NETCODE_AUTOSAVE_INTERVAL_SEC` (default `10`)
- `NETCODE_SAVE_DB_PATH` (default `server/netcode/data/netcode.sqlite3`)
- `NETCODE_INSECURE_ALLOW_ANONYMOUS_TOKENS` (default `false`)

## Local Dev Example
```bash
export NETCODE_AUTH_SECRET='dev-secret-change-me'
export NETCODE_ADMIN_API_KEY='dev-admin-key-change-me'
export NETCODE_INSECURE_ALLOW_ANONYMOUS_TOKENS='true'
cd server
uvicorn netcode.app:app --reload --port 8765
```

## API Quick Start

### 1. Mint a player token
```bash
curl -X POST http://localhost:8765/session/token \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: dev-admin-key-change-me" \
  -d '{
    "room_id":"alpha",
    "player_id":"p1",
    "display_name":"Player One",
    "role":"player"
  }'
```

### 2. Connect websocket
- Endpoint: `ws://localhost:8765/ws/alpha?token=<token>`

### 3. Send command envelope
```json
{
  "kind": "command",
  "seq": 1,
  "data": {
    "command": "place_building",
    "build_id": "conveyor",
    "x": 12,
    "y": 18,
    "direction": "right"
  }
}
```

## Admin Save/Load

Save room:
```bash
curl -X POST http://localhost:8765/admin/save/alpha \
  -H "X-Admin-Key: dev-admin-key-change-me"
```

Load room:
```bash
curl -X POST http://localhost:8765/admin/load/alpha \
  -H "X-Admin-Key: dev-admin-key-change-me"
```

List rooms:
```bash
curl http://localhost:8765/admin/rooms \
  -H "X-Admin-Key: dev-admin-key-change-me"
```

## Operations Notes
- Snapshot writes are autosaved on interval and on room shutdown.
- Idle rooms are removed from memory and saved automatically.
- Command audit is persisted when enabled (`NETCODE_COMMAND_AUDIT_ENABLED=true`).
