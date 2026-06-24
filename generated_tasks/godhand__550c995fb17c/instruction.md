# Task description

The lobby control-plane API regressed: routing/region fallback for lobby assignment no longer behaves correctly, and several backend tests have become flaky or fail outright. Restore stable lobby routing behavior in `server/api/routers/lobby.py` so that lobby join and assignment endpoints select a healthy game server even when the requested region has no available capacity, falling back to an alternate region instead of erroring or returning an unassigned lobby.

Any routing constants this fallback depends on (region ordering, default region, or sentinel values) belong in `server/utils/constants.py` so they stay consistent with how other routers consume that module. Keep existing route paths, status codes, and response shapes unchanged; this is a behavior restoration, not an API redesign.

Success means: requesting a lobby in a region with capacity assigns within that region; requesting a region with no capacity assigns via the defined fallback order; and the backend test suite runs deterministically across repeated invocations. Do not modify frontend code, websocket handlers, or unrelated routers.

## Response contract

Preserve these exact observable shapes (existing consumers and the lobby tests depend on them):

- `POST /api/v1/lobbies` (authenticated) → `201`, body `{"lobby": {...}}`. The lobby object includes `_id`, `lobby_name`, `owner_user_id` (the creator's `_id`), `user_capacity`, `players` (a list, initially `[owner_user_id]`), and `world_snapshot` (default `null`).
- `POST /api/v1/lobbies` without authentication → `401` or `403`.
- `GET /api/v1/lobbies/{lobby_id}` → `200`, body `{"lobby": {...}}`.
- `POST /api/v1/lobbies/{lobby_id}/join` (authenticated) → `200`. The body includes `lobby` (with the joining user appended to `players`). When no game server is registered, fall back to the defaults: `gameWsUrl == "ws://127.0.0.1:5050/api/v1/ws/game/{lobby_id}"`, `chatWsUrl == "ws://127.0.0.1:5050/api/v1/ws/lobby/{lobby_id}"`, and `lobby.assigned_game_server_id == "game-server-default"`.
- `POST /api/v1/lobbies/{lobby_id}/leave` (authenticated) → `200`, body includes `lobby`; the leaving user is removed from `players` and `owner_user_id` is unchanged.
- `GET /api/v1/lobbies` → `200`; with no registered servers it defaults to the official servers.

# Test guidelines

Run the suite with `make test-backend`, which invokes `./server/scripts/test.sh` against `server/tests`. Tests use the `testing` environment and mocked Mongo from `server/tests/conftest.py`.

Add or extend coverage in `server/tests` (notably `test_lobby_api.py`) for: assignment within an available region, fallback when the requested region is full or absent, and repeated runs producing identical outcomes. Avoid time- or ordering-dependent assertions that reintroduce flakiness.

# Lint guidelines

No separate linter is configured for the backend. Keep imports ordered consistently with neighboring router modules and ensure `make test-backend` passes cleanly with no warnings introduced.

# Style guidelines

Match the existing `from __future__ import annotations` and typing conventions used across `server/api/routers`. Reuse `HttpStatus` and `ResponseMessages` from `server/utils/constants.py` rather than inlining literals, and keep new constants colocated there.

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
