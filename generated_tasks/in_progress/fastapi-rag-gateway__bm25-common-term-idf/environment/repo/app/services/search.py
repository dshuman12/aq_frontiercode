"""Retrieval / search service."""

from __future__ import annotations

import time
from collections.abc import Iterable

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.rag.rerankers import BaseReranker, get_reranker
from app.rag.retrievers import BaseRetriever, RetrievedItem, get_retriever
from app.schemas.search import RetrievedChunk, SearchRequest, SearchResponse


class SearchService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        settings: Settings | None = None,
        retriever: BaseRetriever | None = None,
        reranker: BaseReranker | None = None,
    ) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.retriever = retriever or get_retriever(self.settings.retriever, settings=self.settings)
        self.reranker = reranker or get_reranker(self.settings.reranker, settings=self.settings)

    async def search(self, payload: SearchRequest) -> SearchResponse:
        started = time.monotonic()
        items = await self.retriever.aretrieve(
            payload.query,
            top_k=payload.top_k,
            filter=payload.metadata_filter,
        )
        if payload.score_threshold is not None:
            items = [item for item in items if item.score >= payload.score_threshold]
        if payload.document_ids:
            allowed = set(payload.document_ids)
            items = [item for item in items if item.document_id in allowed]
        rerank_applied = False
        rerank = payload.rerank
        if rerank is None:
            rerank = self.settings.rerank_enabled
        if rerank:
            items = await self.reranker.arerank(payload.query, items, top_k=payload.top_k)
            rerank_applied = True
        latency = (time.monotonic() - started) * 1000
        return SearchResponse(
            query=payload.query,
            results=list(_to_chunks(items)),
            total=len(items),
            rerank_applied=rerank_applied,
            latency_ms=latency,
        )


def _to_chunks(items: Iterable[RetrievedItem]) -> Iterable[RetrievedChunk]:
    for item in items:
        yield RetrievedChunk(
            chunk_id=item.id,
            document_id=item.document_id or "",
            document_title=item.document_title,
            text=item.text,
            score=item.score,
            rank=item.rank,
            metadata=dict(item.metadata),
        )


__all__ = ["SearchService"]
