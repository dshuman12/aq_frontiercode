# Multiplayer Architecture

## Scope

This document describes how multiplayer currently works end-to-end for official servers and in-game co-op building.

## High-Level Model

The game uses a hybrid model:

- Lockstep commands for placement/removal/machine recipe changes.
- Snapshot replication for full-world reconciliation and non-lockstep state changes.
- Presence sync for remote cursor and placement previews.
- Separate chat transport.

This is not a pure deterministic lockstep implementation yet. It is a lockstep-plus-snapshot model designed to stay robust during joins/rejoins.

## Entry Flow (Title -> Lobby -> Game)

1. `LobbyScreen` loads official servers from `GET /api/v1/lobbies?kind=official`.
2. Player joins with `POST /api/v1/lobbies/{lobby_id}/join`.
3. Client navigates to `/game` with `lobbyId`.
4. `GameScreen` opens game sync socket via `useLobbyGameSocket`.

Related files:

- `frontend/src/pages/lobby/LobbyScreen.tsx`
- `server/api/routers/lobby.py`
- `frontend/src/pages/game/GameScreen.tsx`
- `frontend/src/pages/game/multiplayer/useLobbyGameSocket.ts`

## Transports

- Game state socket: `GET /api/v1/ws/game/{lobby_id}`
- Chat socket: `GET /api/v1/ws/lobby/{lobby_id}`

Chat and gameplay are intentionally separated so chat remains responsive even when gameplay sync is busy.

## Server Session Validation

On game socket connect, backend enforces:

- Valid websocket auth (`access_token_cookie` / JWT claims).
- Existing lobby.
- User is a member of `lobby.players`.

If checks fail, socket closes with `1008`.

Reference: `server/api/websockets/lobby_game.py`

## Game Socket Bootstrap Sequence

When a player connects to `/ws/game/{lobby_id}`, server sends:

1. `snapshot` (latest world snapshot, from pending memory or DB).
2. `presence_batch` (all current remote presences).
3. `lockstep_bootstrap` (`currentTick`, `tickIntervalMs`).
4. Broadcast `snapshot_request` to other players in the lobby.

Why `snapshot_request` exists:

- A currently connected client can immediately publish a fresh snapshot (including static world when needed), so late joiners converge quickly.

## Message Types

### Client -> Server (`kind`)

- `state_sync`
  - Payload: `{ snapshot }`
  - Used for full snapshot replication.
- `presence_update`
  - Payload: `{ presence }`
  - Used for cursor/placement overlays.
- `presence_clear`
  - Clears local presence when leaving/disabling.
- `lockstep_command`
  - Payload: `{ tick, command }`
  - Command types:
    - `place_steps`
    - `remove_cell`
    - `set_machine_recipe`

### Server -> Client (`type`)

- `snapshot`
- `state_sync`
- `presence_batch`
- `presence_sync`
- `presence_clear`
- `lockstep_bootstrap`
- `lockstep_tick`
- `snapshot_request`
- `ack` (for `state_sync`)
- `error` (`invalid_payload`, `late_command`, etc.)

## Lockstep Command Flow

### Client Side

- `GameCanvas` estimates server tick from last received tick timing.
- Local command target tick = `max(estimatedServerTick, nextTick, lastQueuedTick) + 4`.
- Command is sent via `sendLockstepCommand`.
- Client applies lockstep packets only when matching tick data arrives.

Constants:

- Tick rate: 60 Hz (`tickIntervalMs ~= 16.67ms`)
- Input delay: `LOCKSTEP_INPUT_DELAY_TICKS = 4`

### Server Side

- Commands are queued per lobby and per tick.
- If `tick < current_tick`, server rejects command (`late_command` error).
- Background loop advances at 60 Hz and broadcasts:
  - `lockstep_tick { tick, commands[] }`

### Apply Semantics

Client applies each command envelope to local simulation state:

- `place_steps`: place structures over path cells.
- `remove_cell`: remove structure/build at target cell.
- `set_machine_recipe`: mutate selected recipe/machine state.

After command application, one simulation step runs for that tick interval.

## Snapshot Sync Flow

Snapshots are built by `buildMultiplayerSnapshot` and normalized by `normalizeMultiplayerSnapshot`.

Snapshot content (`version: 1`):

- Dynamic state:
  - belts/items/miners/hubs/inventory/materials/unlocked/storage/bridges/nextId
- Static world (optional):
  - terrain/bridgeSlots/oreDeposits/valleySeed
- Structure and machine maps:
  - placedStructures/refundableBuilds/processingMachines

Snapshot behavior:

- Outbound client snapshot send is throttled (`40ms`).
- Server persist is coalesced (`250ms`) and written to `Lobby.world_snapshot`.
- On join/rejoin, server serves latest pending snapshot if one exists, otherwise DB snapshot.

Important: non-lockstep mutations currently use snapshot sync:

- craft/unlock/debug/regenerate-world actions.

## Presence Sync and Overlay Rendering

Local client publishes presence (throttled `60ms`):

- `cursorCell`
- `placementCell`
- `placementBuildId`
- `placementDirection`

Remote presence is rendered in `GameCanvas` as:

- Cursor crosshair + username.
- Placement footprint hint + direction + username.

Presence overlays are toggleable in `SettingsFloatingWindow`:

- Show other players' cursors.
- Show other players' placement previews.

## Disconnect / Restart Behavior

`GameScreen` tracks socket lifecycle:

- If a game socket had opened and then closes unexpectedly, client shows a blocking modal.
- Modal offers:
  - Return to Lobby
  - Return to Title

This handles backend restart/disconnect scenarios without leaving the player in a broken in-game state.

## Auth Persistence Across Restart

Login persistence is cookie/JWT-based, not websocket-state-based.

- If auth cookies remain valid, users generally stay signed in after backend restarts.
- Game socket and chat socket still need to reconnect.
- In-memory server maps (presence, pending lockstep queues, live connections) reset on restart.

## Current Modularity

Multiplayer concerns are split into focused modules:

- Client protocol/types:
  - `frontend/src/pages/game/multiplayer/types.ts`
  - `frontend/src/pages/game/multiplayer/useLobbyGameSocket.ts`
  - `frontend/src/pages/game/multiplayer/snapshotCodec.ts`
- Client gameplay/render integration:
  - `frontend/src/pages/game/components/GameCanvas.tsx`
  - `frontend/src/pages/game/GameScreen.tsx`
  - `frontend/src/pages/game/components/windows/SettingsFloatingWindow.tsx`
- Server protocol/runtime:
  - `server/api/websockets/lobby_game.py`
  - `server/api/websockets/connection_hub.py`
  - `server/api/routers/lobby.py`

## Known Gaps / Next Up

- Pure deterministic lockstep is incomplete because snapshot reconciliation is still used for some gameplay mutations.
- Lockstep/presence state is in-memory on server and does not survive process restart.
- `late_command` and other game-socket errors are not surfaced to users with rich UI yet.
