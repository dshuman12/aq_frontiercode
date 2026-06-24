# Dynamic Game Server Architecture

This document describes the current control-plane/data-plane setup for multiplayer game server routing.

## High-Level Design

- **Director / control-plane**: `server.app:app` (the `api` container)
  - Auth, lobby APIs, chat APIs.
  - Server registry API for game servers.
  - Lobby join routing decision logic.
- **Game data-plane**: `server.game_server:app` (the `game_*` containers)
  - Game websocket endpoint only.
  - Self-registers with director and sends heartbeat.

## Runtime Components

- `api` service (port `5050` on host) is the directory and router.
- `game_na_west_1` (host `5051`)
- `game_na_west_2` (host `5052`)
- `game_na_west_3` (host `5053`)
- `mongo` stores lobby + game server registry records.

## Registry Model

Registry records are stored in Mongo collection:

- `game_server_registry`

Model file:

- `server/external/db/models/game_server_registry.py`

Core fields:

- `server_id`
- `owner_type` (`official` or `player`)
- `region`
- `official_keys` (for deterministic mapping to official lobbies)
- `game_ws_base_url`
- `chat_ws_base_url`
- `status`
- `last_heartbeat_at`
- `heartbeat_expires_at`

Health is lease-based: if heartbeat expires, the server is excluded from routing.

## Internal Registration API

Director routes:

- `POST /api/v1/internal/game-servers/register`
- `POST /api/v1/internal/game-servers/{server_id}/heartbeat`

Router file:

- `server/api/routers/game_server_registry.py`

Auth:

- Header: `X-Game-Server-Token`
- Compared against env/config: `GAME_SERVER_INTERNAL_TOKEN`
- Optional hardened mode via per-server signed headers:
  - `X-Game-Server-Id`
  - `X-Game-Server-Timestamp`
  - `X-Game-Server-Signature` (HMAC-SHA256 over `<server_id>:<timestamp>`)
  - Credentials map: `GAME_SERVER_CREDENTIALS_JSON`

## Assignment Selection Logic

Selection entrypoint:

- `server/api/routers/lobby.py` -> `_select_game_server_assignment(...)`

Selection order:

1. Healthy DB-registered server with matching `official_key`.
2. Healthy DB-registered server with matching normalized region.
3. First healthy DB-registered server.
4. Fallback to legacy `GAME_SERVER_REGISTRY_JSON` config only if DB registry is empty.

This means manual JSON routing is no longer required during normal operation.

## Server Identity Hardening

When `GAME_SERVER_CREDENTIALS_JSON` is configured on the director:

- Registration/heartbeat uses per-server signed authentication.
- Each server id is mapped to:
  - `signing_secret`
  - `allowed_official_keys`
- Director enforces that an official server cannot register keys outside its allowlist.
- Signature timestamps are freshness-checked via `GAME_SERVER_SIGNATURE_MAX_SKEW_SECONDS`.

Fallback behavior:

- If no credentials map is configured, director falls back to shared token auth (`GAME_SERVER_INTERNAL_TOKEN`).

## Game Server Self-Registration

File:

- `server/game_server.py`

At startup, each game server:

1. Calls register endpoint.
2. Starts periodic heartbeat loop.
3. Re-registers if heartbeat returns not found.

Per-container identity is injected via env variables in Compose.

## Required Environment Variables

Director (`api`) needs:

- `MAIN_APP_INCLUDE_GAME_WS=false`
- `GAME_SERVER_INTERNAL_TOKEN=<shared-secret>`

Game server services need:

- `CONTROL_PLANE_INTERNAL_BASE_URL=http://api:5000` (inside Docker network)
- `GAME_SERVER_INTERNAL_TOKEN=<same-shared-secret>`
- `GAME_SERVER_SELF_ID=<unique-id>`
- `GAME_SERVER_SELF_REGION=<display-region>`
- `GAME_SERVER_SELF_OFFICIAL_KEYS=<comma-separated-official-keys>`
- `GAME_SERVER_SELF_SIGNING_SECRET=<server-specific-secret>`
- `GAME_WS_PUBLIC_BASE_URL=<public WS base for that server>`
- `CHAT_WS_PUBLIC_BASE_URL=<public chat WS base>`

Tuning:

- `GAME_SERVER_HEARTBEAT_TTL_SECONDS` (default `20`)
- `GAME_SERVER_HEARTBEAT_INTERVAL_SECONDS` (default `5`)
- `GAME_SERVER_SIGNATURE_MAX_SKEW_SECONDS` (default `60`)

## Official Lobbies and Discovery

Official lobbies are seeded from:

- `server/api/routers/lobby.py` -> `OFFICIAL_LOBBY_BLUEPRINTS`

Current official keys:

- `na-west-1`
- `na-west-2`
- `na-west-3`

The lobby finder lists official lobbies from this blueprint set, and joins are routed via the registry.

## Docker Usage

This repo now has three compose entrypoints:

- `docker-compose.yml`: director/control-plane stack (api + mongo).
- `docker-compose.game-servers.yml`: only game server containers.
- `docker-compose.all.yml`: all-in-one stack (director + game servers + mongo).

From `server/`:

Run director only:

```bash
docker compose up --build
```

Run game servers only:

```bash
docker compose -f docker-compose.game-servers.yml -f docker-compose.game-servers.override.yml up --build
```

Run everything together:

```bash
docker compose -f docker-compose.all.yml -f docker-compose.all.override.yml up --build
```

Or use Docker startup scripts from the repo root:

```bash
./server/scripts/docker/start-director.sh
./server/scripts/docker/start-game-servers.sh
./server/scripts/docker/start-all.sh
```

Run individual game server containers:

```bash
./server/scripts/docker/start-game-na-west-1.sh
./server/scripts/docker/start-game-na-west-2.sh
./server/scripts/docker/start-game-na-west-3.sh
```

Pass normal `docker compose up` args through the scripts, for example:

```bash
./server/scripts/docker/start-all.sh -d
./server/scripts/docker/start-game-servers.sh --remove-orphans
```

Run locally without Docker (one process per terminal):

```bash
./server/scripts/local/start-director.sh
./server/scripts/local/start-game-servers.sh
./server/scripts/local/start-all.sh
./server/scripts/local/start-game-na-west-1.sh
./server/scripts/local/start-game-na-west-2.sh
./server/scripts/local/start-game-na-west-3.sh
```

## Moving Toward Player-Hosted Servers

This architecture is designed to support player-hosted servers without manual director config:

- Player-hosted game server runs same game-server app.
- It registers with `owner_type=player`.
- Director can list/filter by owner type, trust, visibility, and policy.

Future additions (recommended):

- Signed short-lived registration tokens instead of one shared static token.
- Capacity/load-aware selection policy.
- Moderation and trust controls for player-hosted entries.
- Relay/NAT strategy for hosts behind home networks.

