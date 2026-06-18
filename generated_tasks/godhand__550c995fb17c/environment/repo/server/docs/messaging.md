# Backend Messaging Reference

## Transport

- WebSocket endpoint: `GET /api/v1/ws/lobby/{lobby_id}`
- REST endpoints: `/api/v1/messaging/*`

## WebSocket Authentication

- Requires valid `access_token_cookie`.
- Connections without a valid access token are rejected with close code `1008`.

## WebSocket Message Contract

### Client -> Server

Accepted payload shape:

```json
{ "text": "hello" }
```

Rules:

- Payload must be a JSON object.
- Only the `text` key is accepted.
- `text` must be a string and must satisfy domain validation rules.

### Server -> Client Events

- `chat`: `{ "type": "chat", "lobbyId": "...", "user": "...", "text": "...", "ts": 123 }`
- `system`: `{ "type": "system", "lobbyId": "...", "text": "...", "count": 1, "ts": 123 }`
- `error`: `{ "type": "error", "code": "...", "detail": "..." }`

Error events are sent for invalid payloads and invalid messages. The socket remains open.

## REST Endpoints

### `GET /api/v1/messaging/lobbies/{lobby_id}`

- Returns current websocket connection count for the lobby.

### `POST /api/v1/messaging/lobbies/{lobby_id}/messages`

- Requires authenticated access token + CSRF header/cookie checks.
- Message sender is derived from authenticated identity.
- Not sure if we need this, but keeping it for compatibility?

## Core Modules

- `server/api/routers/messaging.py`: REST handlers for lobby status and authenticated message broadcast.
- `server/api/websockets/lobby_chat.py`: authenticated websocket protocol handling and dispatch.
- `server/api/websockets/connection_hub.py`: in-memory connection/presence manager and broadcaster.
- `server/application/messaging/chat_service.py`: messaging use-cases and domain-rule orchestration.
- `server/application/messaging/broadcaster.py`: broadcaster protocol.
- `server/domain/messaging/models.py`: message payload models.
- `server/domain/messaging/rules.py`: message validation rules.
- `server/domain/messaging/errors.py`: domain exceptions.
