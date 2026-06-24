"""Conversation-memory abstractions."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence

from app.core.config import Settings, get_settings
from app.rag.types import ChatTurn


class BaseMemory(ABC):
    name: str = "base"

    def __init__(self, *, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    @abstractmethod
    def messages(self, conversation_id: str) -> list[ChatTurn]: ...

    @abstractmethod
    def remember(self, conversation_id: str, message: ChatTurn) -> None: ...

    def remember_many(self, conversation_id: str, messages: Sequence[ChatTurn]) -> None:
        for message in messages:
            self.remember(conversation_id, message)

    @abstractmethod
    def reset(self, conversation_id: str) -> None: ...


ConversationMemory = BaseMemory


__all__ = ["BaseMemory", "ConversationMemory"]
