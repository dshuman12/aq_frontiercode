"""Conversation-memory helpers."""

from __future__ import annotations

from app.core.config import Settings, get_settings
from app.rag.memory.base import BaseMemory, ConversationMemory
from app.rag.memory.buffer import BufferMemory
from app.rag.memory.summary import SummaryBufferMemory
from app.rag.memory.window import WindowMemory


def get_memory(name: str | None = None, *, settings: Settings | None = None) -> BaseMemory:
    settings = settings or get_settings()
    name = (name or "buffer").lower()
    if name == "buffer":
        return BufferMemory(settings=settings)
    if name == "window":
        return WindowMemory(settings=settings)
    if name == "summary":
        return SummaryBufferMemory(settings=settings)
    raise ValueError(f"Unknown memory: {name!r}")


__all__ = [
    "BaseMemory",
    "BufferMemory",
    "ConversationMemory",
    "SummaryBufferMemory",
    "WindowMemory",
    "get_memory",
]
