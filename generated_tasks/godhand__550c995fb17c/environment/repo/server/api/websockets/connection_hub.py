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
        replaced_sockets: list[WebSocket] = []
        async with self._lock:
            self._lobbies.setdefault(lobby_id, {})
            if user_id:
                replaced_sockets = [
                    ws
                    for ws, info in self._lobbies[lobby_id].items()
                    if info.user_id == user_id and ws is not websocket
                ]
                for ws in replaced_sockets:
                    self._lobbies[lobby_id].pop(ws, None)
            self._lobbies[lobby_id][websocket] = ConnectionInfo(
                websocket=websocket,
                user_id=user_id,
                username=username,
            )
        for ws in replaced_sockets:
            try:
                await ws.close(code=1008)
            except Exception:
                pass

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

    async def get_connection_info(
        self,
        lobby_id: str,
        websocket: WebSocket,
    ) -> ConnectionInfo | None:
        async with self._lock:
            lobby = self._lobbies.get(lobby_id, {})
            return lobby.get(websocket)

    async def lobby_members(self, lobby_id: str) -> list[ConnectionInfo]:
        async with self._lock:
            lobby = self._lobbies.get(lobby_id, {})
            return list(lobby.values())

    async def is_user_connected(self, lobby_id: str, user_id: str) -> bool:
        if not user_id:
            return False
        async with self._lock:
            lobby = self._lobbies.get(lobby_id, {})
            return any(info.user_id == user_id for info in lobby.values())

    async def close_lobby(self, lobby_id: str, *, code: int = 1012, reason: str = "") -> int:
        async with self._lock:
            lobby = self._lobbies.pop(lobby_id, {})
            sockets = list(lobby.keys())

        closed = 0
        for ws in sockets:
            try:
                await ws.close(code=code, reason=reason)
                closed += 1
            except Exception:
                pass
        return closed
