from __future__ import annotations

import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from typing import Any

from server.application.messaging.broadcaster import Broadcaster
from server.domain.messaging.models import ChatMessage, SystemMessage
from server.domain.messaging.rules import validate_message_text


class ChatService:
    def __init__(
        self,
        broadcaster: Broadcaster,
        lobby_size_provider: Callable[[str], Awaitable[int]],
        *,
        time_provider: Callable[[], float] = time.time,
        history_limit: int = 50,
    ) -> None:
        self._broadcaster = broadcaster
        self._lobby_size_provider = lobby_size_provider
        self._time_provider = time_provider
        self._history_limit = history_limit
        self._history: dict[str, deque[dict[str, Any]]] = defaultdict(
            lambda: deque(maxlen=self._history_limit)
        )

    def _now_ts(self) -> int:
        return int(self._time_provider())

    def get_recent_messages(self, lobby_id: str) -> list[dict[str, Any]]:
        return list(self._history.get(lobby_id, []))

    def _store_message(self, lobby_id: str, payload: dict[str, Any]) -> None:
        self._history[lobby_id].append(payload)

    async def on_join(self, lobby_id: str, username: str | None) -> None:
        message = SystemMessage(
            lobby_id=lobby_id,
            text=f"{username or 'Someone'} joined",
            ts=self._now_ts(),
            count=await self._lobby_size_provider(lobby_id),
        )
        payload = message.to_payload()
        self._store_message(lobby_id, payload)
        await self._broadcaster.broadcast(lobby_id, payload)

    async def on_leave(self, lobby_id: str, username: str | None) -> None:
        message = SystemMessage(
            lobby_id=lobby_id,
            text=f"{username or 'Someone'} left",
            ts=self._now_ts(),
            count=await self._lobby_size_provider(lobby_id),
        )
        payload = message.to_payload()
        self._store_message(lobby_id, payload)
        await self._broadcaster.broadcast(lobby_id, payload)

    async def send_message(self, lobby_id: str, user: str, text: str) -> None:
        valid_text = validate_message_text(text)
        message = ChatMessage(
            lobby_id=lobby_id,
            user=user,
            text=valid_text,
            ts=self._now_ts(),
        )
        payload = message.to_payload()
        self._store_message(lobby_id, payload)
        await self._broadcaster.broadcast(lobby_id, payload)