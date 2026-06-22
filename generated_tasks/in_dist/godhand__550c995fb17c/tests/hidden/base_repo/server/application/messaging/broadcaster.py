from __future__ import annotations

from typing import Any, Protocol

from fastapi import WebSocket


class Broadcaster(Protocol):
    async def broadcast(
        self,
        lobby_id: str,
        message: dict[str, Any],
        *,
        exclude: WebSocket | None = None,
    ) -> None:
        ...

