from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from server.api.websockets.connection_hub import ConnectionHub
from server.application.messaging.chat_service import ChatService
from server.domain.messaging.errors import InvalidMessageError

router = APIRouter(prefix="/api/v1")

connection_hub = ConnectionHub()
chat_service = ChatService(connection_hub, connection_hub.lobby_size)


def _safe_parse_json(text: str) -> dict[str, Any]:
    try:
        val = json.loads(text)
        return val if isinstance(val, dict) else {"text": text}
    except Exception:
        return {"text": text}


@router.websocket("/ws/lobby/{lobby_id}")
async def lobby_chat_ws(websocket: WebSocket, lobby_id: str) -> None:
    username: str | None = websocket.query_params.get("user")
    await connection_hub.connect(lobby_id, websocket, username=username)
    await chat_service.on_join(lobby_id, username)

    try:
        while True:
            raw = await websocket.receive_text()
            incoming = _safe_parse_json(raw)
            text = str(incoming.get("text") or "")
            user = str(incoming.get("user") or username or "anonymous")
            try:
                await chat_service.send_message(lobby_id, user, text)
            except InvalidMessageError:
                continue
    except WebSocketDisconnect:
        await connection_hub.disconnect(lobby_id, websocket)
        await chat_service.on_leave(lobby_id, username)
    except Exception:
        await connection_hub.disconnect(lobby_id, websocket)

