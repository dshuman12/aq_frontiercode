"""Document schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseSchema, IdentifiableSchema


class DocumentCreate(BaseSchema):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=4000)
    source_type: str = Field(default="upload", max_length=32)
    source_uri: str | None = Field(default=None, max_length=2048)
    content_type: str | None = Field(default=None, max_length=120)
    language: str | None = Field(default=None, max_length=8)
    tags: list[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)
    text: str | None = Field(default=None)


class DocumentUpdate(BaseSchema):
    title: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=4000)
    tags: list[str] | None = None
    metadata: dict | None = None


class DocumentOut(IdentifiableSchema):
    title: str
    description: str | None = None
    source_type: str
    source_uri: str | None = None
    content_type: str | None = None
    language: str | None = None
    status: str
    error: str | None = None
    chunk_count: int
    token_count: int
    size_bytes: int | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)
    indexed_at: datetime | None = None


class IngestionJobOut(IdentifiableSchema):
    document_id: str
    status: str
    attempt: int
    chunks_processed: int
    embeddings_created: int
    progress: float
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None
    options: dict = Field(default_factory=dict)
    result: dict = Field(default_factory=dict)


__all__ = [
    "DocumentCreate",
    "DocumentOut",
    "DocumentUpdate",
    "IngestionJobOut",
]
