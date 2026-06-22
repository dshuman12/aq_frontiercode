# Netcode Architecture

## Goals
- Authoritative multiplayer simulation on the server.
- WebSocket transport for low-latency command/input.
- Durable room snapshots with load/recovery support.

## High-Level Components
- `app.py`
  - FastAPI app + WebSocket endpoint.
  - Token minting endpoint and admin save/load endpoints.
- `rooms.py`
  - `RoomManager` lifecycle and idle-room cleanup.
  - `RoomSession` fixed-tick simulation loop, client registry, broadcast pipeline.
- `simulation.py`
  - Authoritative command handlers (`place/remove/set_recipe/manual craft`).
  - Tick advancement for manual and processor crafting.
  - Resource/storage limits and build cost enforcement.
- `security.py`
  - HMAC-signed player session tokens with expiration.
  - Constant-time admin key comparison.
- `persistence.py`
  - SQLite store for room snapshots and command audit logs.

## Data Flow
1. Client obtains signed session token (`POST /session/token`).
2. Client opens `GET ws /ws/{room_id}?token=...`.
3. Server validates token and joins player to a room session.
4. Client sends command envelopes.
5. Server validates:
   - schema and command allow-list
   - ownership/build bounds/cost/resource constraints
6. Server mutates authoritative state, sends `ack`, and broadcasts snapshots.
7. Room loop autosaves to SQLite at configured intervals.

## Authoritative Model
- Server never accepts client-supplied world state deltas.
- Clients submit intents only; server computes all resulting state transitions.
- Build placement/removal/resource spending/refunds are server-side only.
- Crafting progression and outputs are server tick-driven only.

## Input Validation
- Signed room-bound token required by default (`NETCODE_INSECURE_ALLOW_ANONYMOUS_TOKENS=false`).
- Commands are validated against:
  - known command schema
  - known build IDs and recipes
  - map bounds and occupied cells
  - unlocked-build list
  - resource/capacity constraints
- Optional command audit log persists accepted/rejected command metadata.

## Persistence and Recovery
- `worlds` table stores latest room snapshot JSON by `room_id`.
- `command_audit` table stores command result trail (accepted/rejected + reason).
- `RoomSession` autosaves periodically.
- Admin endpoints:
  - `POST /admin/save/{room_id}`
  - `POST /admin/load/{room_id}`
- Server restart recovers rooms from `worlds` when re-opened.

## Security Notes
- Production should rotate:
  - `NETCODE_AUTH_SECRET`
  - `NETCODE_ADMIN_API_KEY`
- Run behind TLS and authenticated edge gateway for token issuance.

## Extension Points
- Replace snapshot broadcast with delta compression.
- Add deterministic terrain and belt graph simulation parity with frontend.
- Add role/permissions service integration for token issuance.
- Add replay protection/rate limiting when reintroducing anti-cheat.
