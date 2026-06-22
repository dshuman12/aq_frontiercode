from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from server.api.websockets.connection_hub import ConnectionHub
from server.api.security.jwt import JWTService
from server.api.security.websocket_rate_limit import allow_connect, allow_message
from server.application.messaging.chat_service import ChatService
from server.domain.messaging.errors import InvalidMessageError
from server.external.db.models.lobby import Lobby
from server.external.db.models.user import User
from server.utils.error_handlers import AuthenticationError

router = APIRouter(prefix="/api/v1")

connection_hub = ConnectionHub()
chat_service = ChatService(connection_hub, connection_hub.lobby_size)
_MAX_WS_MESSAGE_BYTES = 64 * 1024


def _safe_parse_json(text: str) -> dict[str, Any]:
    val = json.loads(text)
    if not isinstance(val, dict):
        raise ValueError("Expected a JSON object payload.")
    if set(val.keys()) != {"text"}:
        raise ValueError("Payload must only include the 'text' field.")
    raw_text = val.get("text")
    if not isinstance(raw_text, str):
        raise ValueError("Field 'text' must be a string.")
    return {"text": raw_text}


async def _send_error(websocket: WebSocket, code: str, detail: str) -> None:
    await websocket.send_json(
        {
            "type": "error",
            "code": code,
            "detail": detail,
        }
    )

async def _send_history(websocket: WebSocket, history: list[dict[str, Any]]) -> None:
    await websocket.send_json({
        "type": "history",
        "messages": history,
    })


async def reset_lobby_chat_state(lobby_id: str, *, disconnect_reason: str = "Developer reset.") -> dict[str, int]:
    closed_connections = await connection_hub.close_lobby(
        lobby_id,
        code=1012,
        reason=disconnect_reason[:120],
    )
    return {"closedConnections": closed_connections}


@router.websocket("/ws/lobby/{lobby_id}")
async def lobby_chat_ws(websocket: WebSocket, lobby_id: str) -> None:
    connect_allowed, connect_retry_after = allow_connect(websocket=websocket, channel="chat")
    if not connect_allowed:
        await websocket.close(code=1013, reason=f"Rate limited. Retry in {connect_retry_after}s.")
        return

    try:
        claims = JWTService.require_access_websocket(websocket)
    except AuthenticationError:
        await websocket.close(code=1008)
        return

    # Get user info from DB
    user_id = str(claims.get("sub"))
    user = User.get_by_id(user_id)
    if not user or not user.username:
        await websocket.close(code=1008)
        return
    username = user.username

    lobby = Lobby.get_by_id(lobby_id)
    if not lobby:
        await websocket.close(code=1008)
        return

    players = lobby.players or []
    if user_id not in players:
        await websocket.close(code=1008)
        return

    # If user already connected, close old connection and replace with new one
    already_connected = await connection_hub.is_user_connected(lobby_id, user_id)
    await connection_hub.connect(lobby_id, websocket, user_id=user_id, username=username)

    history = chat_service.get_recent_messages(lobby_id)
    await _send_history(websocket, history)

    if not already_connected: # Emit on_join only for NEW connections, not reconnections
        await chat_service.on_join(lobby_id, username)

    try:
        # Main receive and send loop; exit on disconnect or error
        while True:
            raw = await websocket.receive_text()
            message_allowed, message_retry_after = allow_message(
                websocket=websocket,
                channel="chat",
                user_id=user_id,
            )
            if not message_allowed:
                await _send_error(
                    websocket,
                    "rate_limited",
                    f"Message rate limit exceeded. Retry in {message_retry_after}s.",
                )
                await websocket.close(code=1013)
                return
            if len(raw.encode("utf-8")) > _MAX_WS_MESSAGE_BYTES:
                await _send_error(websocket, "payload_too_large", "Payload exceeds maximum allowed size.")
                continue
            try:
                incoming = _safe_parse_json(raw)
            except (json.JSONDecodeError, ValueError) as exc:
                await _send_error(websocket, "invalid_payload", str(exc))
                continue

            try:
                await chat_service.send_message(lobby_id, username, incoming["text"])
            except InvalidMessageError as exc:
                await _send_error(websocket, "invalid_message", str(exc))
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        info = await connection_hub.get_connection_info(lobby_id, websocket)
        if info is None:
            return
        await connection_hub.disconnect(lobby_id, websocket)

        if info.user_id and not await connection_hub.is_user_connected(lobby_id, info.user_id):
            await chat_service.on_leave(lobby_id, info.username)
