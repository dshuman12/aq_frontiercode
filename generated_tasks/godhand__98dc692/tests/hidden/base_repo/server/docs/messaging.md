`server/api/routers/messaging.py`
REST endpoints for messaging features. Delegates messaging actions to `chat_service`

`server/api/websockets/lobby_chat.py`
WebSocket entry points for messaging.
Use `connection_hub` for connect, disconnect, etc (real-time websocket handling)
Use `chat_service` for...
 * send_message
 * on_join, on_leave (business semantics e.g. is banned? or is allowed to join?)

`server/api/websockets/connection_hub.py`
In-memory connection manager for lobby messaging. Tracks active WebSocket connections and handles broadcast.

`server/application/messaging/chat_service.py`
Handles messaging use-cases. Coordinates actions such as join, leave, send message, and validation by applying domain rules.
Use `broadcaster` for broadcasting messages to lobbies.

`server/application/messaging/broadcaster.py`
Defines the Broadcaster used by `chat_service` to emit events.
Concrete implementations may deliver via Websockets(`connection_hub`), Mock Broadcaster (for testing), etc

`server/domain/messaging/models.py`
Core domain models for messaging (e.g., ChatMessage, identifiers, value objects).

`server/domain/messaging/rules.py`
Handles message validation, length limits, etc.

`server/domain/messaging/errors.py`
Domain specific error types for rule violations (e.g. InvalidMessageError)