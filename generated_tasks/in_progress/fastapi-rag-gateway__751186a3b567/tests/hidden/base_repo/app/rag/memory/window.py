"""Sliding-window conversation memory."""

from __future__ import annotations

from collections import defaultdict, deque

from app.rag.memory.base import BaseMemory
from app.rag.types import ChatTurn


class WindowMemory(BaseMemory):
    name = "window"

    def __init__(self, *, settings=None, window_size: int | None = None) -> None:
        super().__init__(settings=settings)
        size = window_size or self.settings.memory_window_size or 8
        self._size = max(1, int(size))
        self._store: dict[str, deque[ChatTurn]] = defaultdict(lambda: deque(maxlen=self._size))

    def messages(self, conversation_id: str) -> list[ChatTurn]:
        return list(self._store.get(conversation_id, deque()))

    def remember(self, conversation_id: str, message: ChatTurn) -> None:
        self._store[conversation_id].append(message)

    def reset(self, conversation_id: str) -> None:
        self._store.pop(conversation_id, None)


__all__ = ["WindowMemory"]
