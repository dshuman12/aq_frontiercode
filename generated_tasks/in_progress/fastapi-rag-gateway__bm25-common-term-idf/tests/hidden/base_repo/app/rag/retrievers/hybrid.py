"""Hybrid dense + lexical retriever using Reciprocal Rank Fusion."""

from __future__ import annotations

from collections.abc import Sequence

from app.rag.retrievers.base import BaseRetriever, RetrievedItem
from app.rag.retrievers.bm25 import BM25Retriever
from app.rag.retrievers.dense import DenseRetriever


class HybridRetriever(BaseRetriever):
    name = "hybrid"

    def __init__(
        self,
        *,
        settings=None,
        dense: DenseRetriever | None = None,
        sparse: BM25Retriever | None = None,
        alpha: float | None = None,
    ) -> None:
        super().__init__(settings=settings)
        self.dense = dense or DenseRetriever(settings=settings)
        self.sparse = sparse or BM25Retriever(settings=settings)
        self.alpha = alpha if alpha is not None else (self.settings.retrieval_hybrid_alpha or 0.5)

    def retrieve(self, query: str, *, top_k: int = 4, **kwargs) -> list[RetrievedItem]:
        dense_results = self.dense.retrieve(query, top_k=top_k * 2, **kwargs)
        sparse_results = self.sparse.retrieve(query, top_k=top_k * 2, **kwargs)
        return self._combine(dense_results, sparse_results, top_k=top_k)

    async def aretrieve(self, query: str, *, top_k: int = 4, **kwargs) -> list[RetrievedItem]:
        dense_results = await self.dense.aretrieve(query, top_k=top_k * 2, **kwargs)
        sparse_results = self.sparse.retrieve(query, top_k=top_k * 2, **kwargs)
        return self._combine(dense_results, sparse_results, top_k=top_k)

    # ------------------------------------------------------------------

    def _combine(
        self,
        dense: Sequence[RetrievedItem],
        sparse: Sequence[RetrievedItem],
        *,
        top_k: int,
    ) -> list[RetrievedItem]:
        items: dict[str, RetrievedItem] = {}
        scores: dict[str, float] = {}
        for index, item in enumerate(dense):
            scores[item.id] = scores.get(item.id, 0.0) + self.alpha * _rrf_score(index)
            items.setdefault(item.id, item)
        for index, item in enumerate(sparse):
            scores[item.id] = scores.get(item.id, 0.0) + (1 - self.alpha) * _rrf_score(index)
            items.setdefault(item.id, item)
        ranked = sorted(scores.items(), key=lambda entry: entry[1], reverse=True)
        return self.assign_ranks(
            [
                RetrievedItem(
                    id=identifier,
                    text=items[identifier].text,
                    score=float(score),
                    metadata=dict(items[identifier].metadata),
                    document_id=items[identifier].document_id,
                    document_title=items[identifier].document_title,
                )
                for identifier, score in ranked[:top_k]
            ]
        )


def _rrf_score(rank: int, k: int = 60) -> float:
    return 1.0 / (k + rank + 1)


__all__ = ["HybridRetriever"]
