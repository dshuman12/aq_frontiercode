# Task description

`server/api/routers/messaging.py` has a `# TODO` placeholder where four REST endpoints need to be implemented. Fill them in so the file exposes the following routes under the existing `messaging_routes` router (`prefix="/api/v1/messaging"`):

| Method | Path | Behaviour |
|--------|------|-----------|
| `GET` | `/lobbies/{lobby_id}` | Return `{"lobbyId": lobby_id, "count": <int>}` where `count` is the current number of WebSocket connections in that lobby. |
| `POST` | `/lobbies/{lobby_id}/join` | Broadcast a join event, then return `{"ok": true, "event": "join", "lobbyId": lobby_id, "username": <str or null>, "count": <int>}`. |
| `POST` | `/lobbies/{lobby_id}/leave` | Broadcast a leave event, then return `{"ok": true, "event": "leave", "lobbyId": lobby_id, "username": <str or null>, "count": <int>}`. |
| `POST` | `/lobbies/{lobby_id}/messages` | Validate and broadcast a chat message. Return `{"ok": true, "event": "message", "lobbyId": lobby_id, "user": <str>}` on success, or HTTP 400 if the message fails domain validation. |

The `chat_service` and `connection_hub` singletons you need are already instantiated in `server/api/websockets/lobby_chat.py` — import them from there. Use `connection_hub.lobby_size(lobby_id)` to get the participant count. Use `chat_service.on_join`, `chat_service.on_leave`, and `chat_service.send_message` for the broadcast operations. Map `InvalidMessageError` from `server.domain.messaging.errors` to HTTP 400 using `DomainValidationError` from `server.utils.error_handlers`.

No authentication is required on any of these endpoints.

The join/leave endpoints accept an optional `username` field in the JSON body. The messages endpoint accepts `user` (required, non-empty string) and `text` (string).

Do not modify any other files.

# Test guidelines

Run `make test-backend` to execute the suite via `./server/scripts/test.sh`, which runs `pytest` against `server/tests`. All existing tests must remain green. The new endpoints are covered by the hidden reference tests which will be injected at grading time.

# Lint guidelines

No separate linter is configured. Keep imports clean and avoid unused symbols.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Follow the FastAPI patterns in `server/api/routers/auth.py` for router structure. Use `JSONResponse` with an explicit `status_code` as the other routers do.
