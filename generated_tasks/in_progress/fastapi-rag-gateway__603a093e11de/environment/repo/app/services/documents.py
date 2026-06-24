"""Document service."""

from __future__ import annotations

import hashlib
from collections.abc import Iterable

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.core.pagination import Page, PageRequest
from app.core.security import utc_now
from app.models.document import Document
from app.repositories.chunk import ChunkRepository
from app.repositories.document import DocumentRepository
from app.repositories.ingestion_job import IngestionJobRepository
from app.schemas.document import DocumentCreate, DocumentUpdate


class DocumentService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.documents = DocumentRepository(session)
        self.chunks = ChunkRepository(session)
        self.jobs = IngestionJobRepository(session)

    async def create(
        self,
        owner_id: str | None,
        payload: DocumentCreate,
        *,
        size_bytes: int | None = None,
        checksum: str | None = None,
        text: str | None = None,
    ) -> Document:
        body = text or payload.text or ""
        digest = checksum or hashlib.sha256(body.encode("utf-8")).hexdigest()
        existing = await self.documents.get_by_checksum(owner_id, digest)
        if existing is not None and not existing.deleted_at:
            raise ConflictError(
                "A document with this content already exists.",
                details={"existing_id": existing.id},
            )
        document = Document(
            owner_id=owner_id,
            title=payload.title,
            description=payload.description,
            source_type=payload.source_type,
            source_uri=payload.source_uri,
            content_type=payload.content_type,
            language=payload.language,
            tags=list(payload.tags),
            metadata=dict(payload.metadata),
            checksum=digest,
            size_bytes=size_bytes,
            status="pending",
        )
        await self.documents.create(document)
        return document

    async def update(self, document_id: str, payload: DocumentUpdate) -> Document:
        document = await self.documents.get_or_404(document_id)
        if payload.title is not None:
            document.title = payload.title
        if payload.description is not None:
            document.description = payload.description
        if payload.tags is not None:
            document.tags = list(payload.tags)
        if payload.metadata is not None:
            document.metadata = dict(payload.metadata)
        await self.session.flush()
        return document

    async def delete(self, document_id: str) -> Document:
        document = await self.documents.get_or_404(document_id)
        document.deleted_at = utc_now()
        await self.session.flush()
        return document

    async def hard_delete(self, document_id: str) -> None:
        document = await self.documents.get_or_404(document_id)
        await self.chunks.delete_for_document(document.id)
        await self.documents.delete(document)

    async def list(
        self,
        owner_id: str,
        request: PageRequest,
        *,
        statuses: Iterable[str] | None = None,
    ) -> Page[Document]:
        return await self.documents.list_for_owner(owner_id, request, statuses=statuses)

    async def get(self, document_id: str) -> Document:
        document = await self.documents.get(document_id)
        if document is None or document.deleted_at is not None:
            raise NotFoundError(f"Document {document_id!r} not found.")
        return document

    async def mark_indexed(
        self,
        document: Document,
        *,
        chunk_count: int,
        token_count: int,
    ) -> Document:
        document.status = "indexed"
        document.chunk_count = chunk_count
        document.token_count = token_count
        document.indexed_at = utc_now()
        document.error = None
        await self.session.flush()
        return document

    async def mark_failed(self, document: Document, *, error: str) -> Document:
        document.status = "failed"
        document.error = error[:1000]
        await self.session.flush()
        return document


__all__ = ["DocumentService"]
