"""Retriever interface."""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from collections.abc import Sequence
from dataclasses import dataclass, field

from app.core.config import Settings, get_settings


@dataclass(slots=True)
class RetrievedItem:
    """A retrieval hit returned to the calling layer."""

    id: str
    text: str
    score: float
    rank: int = 0
    metadata: dict[str, object] = field(default_factory=dict)
    document_id: str | None = None
    document_title: str | None = None


class BaseRetriever(ABC):
    name: str = "base"

    def __init__(self, *, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    @abstractmethod
    def retrieve(self, query: str, *, top_k: int = 4, **kwargs) -> list[RetrievedItem]: ...

    async def aretrieve(self, query: str, *, top_k: int = 4, **kwargs) -> list[RetrievedItem]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.retrieve(query, top_k=top_k, **kwargs),
        )

    @staticmethod
    def assign_ranks(items: Sequence[RetrievedItem]) -> list[RetrievedItem]:
        ranked: list[RetrievedItem] = []
        for index, item in enumerate(items):
            ranked.append(
                RetrievedItem(
                    id=item.id,
                    text=item.text,
                    score=item.score,
                    rank=index + 1,
                    metadata=dict(item.metadata),
                    document_id=item.document_id,
                    document_title=item.document_title,
                )
            )
        return ranked


Retriever = BaseRetriever


__all__ = ["BaseRetriever", "Retriever", "RetrievedItem"]
