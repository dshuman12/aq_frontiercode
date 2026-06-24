"""Identity reranker — returns items unchanged."""

from __future__ import annotations

from collections.abc import Sequence

from app.rag.rerankers.base import BaseReranker
from app.rag.retrievers.base import RetrievedItem


class IdentityReranker(BaseReranker):
    name = "identity"

    def rerank(
        self,
        query: str,
        items: Sequence[RetrievedItem],
        *,
        top_k: int | None = None,
    ) -> list[RetrievedItem]:
        materialised = list(items)
        if top_k is None:
            return materialised
        return materialised[:top_k]


__all__ = ["IdentityReranker"]
