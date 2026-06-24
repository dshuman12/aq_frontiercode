"""Reranker interface."""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from collections.abc import Sequence

from app.core.config import Settings, get_settings
from app.rag.retrievers.base import RetrievedItem


class BaseReranker(ABC):
    name: str = "base"

    def __init__(self, *, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    @abstractmethod
    def rerank(
        self,
        query: str,
        items: Sequence[RetrievedItem],
        *,
        top_k: int | None = None,
    ) -> list[RetrievedItem]: ...

    async def arerank(
        self,
        query: str,
        items: Sequence[RetrievedItem],
        *,
        top_k: int | None = None,
    ) -> list[RetrievedItem]:
        return await asyncio.get_running_loop().run_in_executor(
            None,
            lambda: self.rerank(query, items, top_k=top_k),
        )


Reranker = BaseReranker


__all__ = ["BaseReranker", "Reranker"]
