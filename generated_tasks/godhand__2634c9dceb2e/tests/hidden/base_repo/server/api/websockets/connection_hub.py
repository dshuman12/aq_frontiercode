from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from typing import Any
from fastapi import WebSocket

@dataclass
class ConnectionInfo:
    websocket: WebSocket
    user_id: str | None = None
    username: str | None = None

class ConnectionHub:
    """
    In-memory connection manager.
    - Tracks connections per lobby_id
    - Broadcasts messages to everyone connected in that lobby
    """

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._lobbies: dict[str, dict[WebSocket, ConnectionInfo]] = {}

    async def connect(
        self,
        lobby_id: str,
        websocket: WebSocket,
        *,
        user_id: str | None = None,
        username: str | None = None,
    ) -> None:
        await websocket.accept()
        async with self._lock:
            self._lobbies.setdefault(lobby_id, {})
            self._lobbies[lobby_id][websocket] = ConnectionInfo(
                websocket=websocket,
                user_id=user_id,
                username=username,
            )

    async def disconnect(self, lobby_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            lobby = self._lobbies.get(lobby_id)
            if not lobby:
                return
            lobby.pop(websocket, None)
            if not lobby:
                self._lobbies.pop(lobby_id, None)

    async def broadcast(
        self,
        lobby_id: str,
        message: dict[str, Any],
        *,
        exclude: WebSocket | None = None,
    ) -> None:
        async with self._lock:
            lobby = self._lobbies.get(lobby_id, {})
            targets = [ws for ws in lobby if ws is not exclude]

        if not targets:
            return

        payload = json.dumps(message, ensure_ascii=False)
        dead: list[WebSocket] = []
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)

        if dead:
            async with self._lock:
                lobby = self._lobbies.get(lobby_id, {})
                for ws in dead:
                    lobby.pop(ws, None)
                if not lobby and lobby_id in self._lobbies:
                    self._lobbies.pop(lobby_id, None)

    async def lobby_size(self, lobby_id: str) -> int:
        async with self._lock:
            return len(self._lobbies.get(lobby_id, {}))

