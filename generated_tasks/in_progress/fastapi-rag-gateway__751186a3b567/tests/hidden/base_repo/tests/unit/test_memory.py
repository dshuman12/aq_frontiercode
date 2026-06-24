"""Conversation memory tests."""

from __future__ import annotations

from app.core.config import Settings
from app.rag.llm import ChatMessage
from app.rag.memory.buffer import BufferMemory
from app.rag.memory.window import WindowMemory


def test_buffer_memory_collects_messages() -> None:
    memory = BufferMemory(settings=Settings())
    memory.remember("conv-1", ChatMessage(role="user", content="hi"))
    memory.remember("conv-1", ChatMessage(role="assistant", content="hello"))
    assert len(memory.messages("conv-1")) == 2


def test_window_memory_keeps_only_last_n() -> None:
    memory = WindowMemory(settings=Settings(memory_window_size=2))
    for i in range(5):
        memory.remember("conv-1", ChatMessage(role="user", content=f"msg-{i}"))
    msgs = memory.messages("conv-1")
    assert len(msgs) == 2
    assert msgs[-1].content == "msg-4"
