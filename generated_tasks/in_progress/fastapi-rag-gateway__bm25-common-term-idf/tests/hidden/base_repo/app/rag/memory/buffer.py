"""Plain in-memory buffer."""

from __future__ import annotations

from collections import defaultdict

from app.rag.memory.base import BaseMemory
from app.rag.types import ChatTurn


class BufferMemory(BaseMemory):
    name = "buffer"

    def __init__(self, *, settings=None) -> None:
        super().__init__(settings=settings)
        self._store: dict[str, list[ChatTurn]] = defaultdict(list)

    def messages(self, conversation_id: str) -> list[ChatTurn]:
        return list(self._store.get(conversation_id, []))

    def remember(self, conversation_id: str, message: ChatTurn) -> None:
        self._store[conversation_id].append(message)

    def reset(self, conversation_id: str) -> None:
        self._store.pop(conversation_id, None)


__all__ = ["BufferMemory"]
