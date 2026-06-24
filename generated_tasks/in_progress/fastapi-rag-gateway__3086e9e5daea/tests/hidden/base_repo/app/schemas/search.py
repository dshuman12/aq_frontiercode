"""Search / retrieval schemas."""

from __future__ import annotations

from pydantic import Field

from app.core.constants import (
    DEFAULT_RETRIEVAL_K,
    MAX_QUERY_LENGTH,
    MAX_RETRIEVAL_K,
)
from app.schemas.common import BaseSchema


class SearchRequest(BaseSchema):
    query: str = Field(min_length=1, max_length=MAX_QUERY_LENGTH)
    top_k: int = Field(default=DEFAULT_RETRIEVAL_K, ge=1, le=MAX_RETRIEVAL_K)
    score_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    document_ids: list[str] | None = None
    tags: list[str] | None = None
    rerank: bool | None = None
    metadata_filter: dict | None = None


class RetrievedChunk(BaseSchema):
    chunk_id: str
    document_id: str
    document_title: str | None = None
    text: str
    score: float
    rank: int
    metadata: dict = Field(default_factory=dict)


class SearchResponse(BaseSchema):
    query: str
    results: list[RetrievedChunk]
    total: int
    rerank_applied: bool = False
    latency_ms: float | None = None


__all__ = [
    "RetrievedChunk",
    "SearchRequest",
    "SearchResponse",
]
