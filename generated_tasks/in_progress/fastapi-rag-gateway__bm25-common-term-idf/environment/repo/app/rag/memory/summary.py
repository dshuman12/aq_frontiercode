"""Summary-buffer memory.

Keeps the most recent ``window`` messages verbatim and a short rolling
summary of the older history. The summarisation step is delegated to a
caller-supplied callable so this module remains framework-light.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable, Sequence

from app.rag.memory.base import BaseMemory
from app.rag.types import ChatTurn

Summariser = Callable[[Sequence[ChatTurn]], str]


def _default_summariser(turns: Sequence[ChatTurn]) -> str:
    return "Earlier conversation: " + " | ".join(
        f"{turn.role}: {turn.content[:120].strip()}" for turn in turns
    )


class SummaryBufferMemory(BaseMemory):
    name = "summary"

    def __init__(
        self,
        *,
        settings=None,
        window_size: int | None = None,
        summariser: Summariser | None = None,
    ) -> None:
        super().__init__(settings=settings)
        size = window_size or self.settings.memory_window_size or 6
        self._size = max(1, int(size))
        self._summary: dict[str, str] = defaultdict(str)
        self._buffer: dict[str, list[ChatTurn]] = defaultdict(list)
        self._summariser: Summariser = summariser or _default_summariser

    def messages(self, conversation_id: str) -> list[ChatTurn]:
        history: list[ChatTurn] = []
        if self._summary.get(conversation_id):
            history.append(ChatTurn(role="system", content=self._summary[conversation_id]))
        history.extend(self._buffer.get(conversation_id, ()))
        return history

    def remember(self, conversation_id: str, message: ChatTurn) -> None:
        buffer = self._buffer.setdefault(conversation_id, [])
        buffer.append(message)
        if len(buffer) > self._size:
            overflow = buffer[: -self._size]
            self._buffer[conversation_id] = buffer[-self._size :]
            existing = self._summary.get(conversation_id, "")
            new_summary = self._summariser(overflow)
            combined = f"{existing}\n{new_summary}".strip()
            self._summary[conversation_id] = combined[:4000]

    def reset(self, conversation_id: str) -> None:
        self._buffer.pop(conversation_id, None)
        self._summary.pop(conversation_id, None)


__all__ = ["SummaryBufferMemory"]
