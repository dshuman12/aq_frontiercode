# Task description

Add JWT-based authentication to the WebSocket messaging layer while keeping the existing REST messaging endpoints fully operational. The WebSocket and REST flows share one connection hub and emit the same public message shapes.

WebSocket connections to `/api/v1/ws/lobby/{lobbyId}` must authenticate using the same JWT scheme as the HTTP API (`JWTService` in `server/api/security/jwt.py`). Reuse the existing claim extraction so `sub` identifies the user, and keep the established auth semantics (cookie-based access tokens, expiry handling) unchanged. A connect without a valid access token must be rejected and closed with WebSocket close code 1008.

On successful connect the server emits a `system` join message to the lobby: `type` = "system", `lobbyId` = the path lobby id, `text` = "<username> joined", `count` = the current number of connections in that lobby, and an integer `ts`. On disconnect it emits a `system` leave message with `text` = "<username> left" and the decremented `count`. Presence text must use the resolved authenticated USERNAME, never the raw user id.

Inbound WebSocket frames are JSON objects whose only meaningful field is `text`. Validate each frame and emit a structured error event `{type: "error", code: <code>}` instead of broadcasting when:
- the frame is not valid JSON, or the object contains any unexpected field such as `user` -> code "invalid_payload";
- `text` is blank/whitespace-only or longer than `MAX_MESSAGE_LENGTH` -> code "invalid_message".
A valid frame broadcasts a `chat` event to every connection in the lobby with: `type` = "chat", `lobbyId`, `user` = the server-derived authenticated username (any client-supplied `user` is rejected, never trusted), `text`, and an integer `ts`.

When an already-connected user opens a new connection to the same lobby, the prior socket for that user must be closed/replaced with close code 1008, and the replacement must NOT emit spurious join/leave presence churn to other clients.

Keep the REST endpoints in `server/api/routers/messaging.py` working and registered. GET `/api/v1/messaging/lobbies/{lobbyId}` returns 200 with `{lobbyId, count}` (count 0 before any connections). POST `/api/v1/messaging/lobbies/{lobbyId}/messages` requires auth and CSRF; with valid `text` it returns 200 `{ok: true, event: "message", lobbyId, user: <username>}` and broadcasts a `chat` event (shape above, `user` = authenticated username) to WS clients in that lobby; blank `text` maps the domain validation error to 400; an unauthenticated request returns 401.

# Test guidelines

Run `SECRET_KEY=test-secret-key-32-bytes-minimum JWT_SECRET_KEY=test-jwt-secret-key-32-bytes-min FASTAPI_ENV=testing python -m pytest server/tests -q` and ensure the full suite passes. Add focused tests under `server/tests` for the new edge cases (auth rejection, error events, non-spoofable sender, same-user reconnect, REST broadcast). Do not weaken existing auth-flow tests.

# Lint guidelines

Keep imports and router registration consistent with the existing module structure. Do not leave unused imports.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
