"""Ingestion service.

Coordinates loaders, chunkers, embedders and the vector store to take
raw inputs (uploaded files, URLs, plain text) and turn them into
indexed :class:`~app.models.chunk.Chunk` rows.
"""

from __future__ import annotations

import asyncio
from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import IndexingError
from app.core.security import utc_now
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.ingestion_job import IngestionJob
from app.rag.chunking import get_chunker
from app.rag.embeddings import BaseEmbeddingProvider, get_embedding_provider
from app.rag.loaders import LoaderResult, get_loader
from app.rag.types import Document as RAGDocument
from app.rag.vectorstores import (
    BaseVectorStore,
    VectorStoreItem,
    get_vector_store,
)
from app.repositories.chunk import ChunkRepository
from app.repositories.document import DocumentRepository
from app.repositories.ingestion_job import IngestionJobRepository
from app.services.documents import DocumentService


@dataclass(slots=True)
class IngestionResult:
    document: Document
    job: IngestionJob | None
    chunks_indexed: int
    embeddings_created: int
    duration_ms: float
    notes: list[str] = field(default_factory=list)


class IngestionService:
    """End-to-end ingestion pipeline."""

    def __init__(
        self,
        session: AsyncSession,
        *,
        settings: Settings | None = None,
        embedder: BaseEmbeddingProvider | None = None,
        vector_store: BaseVectorStore | None = None,
    ) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.embedder = embedder or get_embedding_provider(self.settings)
        self.vector_store = vector_store or get_vector_store(self.settings)
        self.documents_repo = DocumentRepository(session)
        self.chunks_repo = ChunkRepository(session)
        self.jobs_repo = IngestionJobRepository(session)
        self.docs = DocumentService(session)

    async def ingest_path(
        self,
        path: str | Path,
        *,
        owner_id: str | None,
        title: str | None = None,
        tags: Iterable[str] | None = None,
        metadata: dict | None = None,
    ) -> IngestionResult:
        loader = get_loader(str(path))
        return await self._ingest_loader_result(
            loader.load_path(path),
            owner_id=owner_id,
            title=title,
            tags=tags,
            metadata=metadata,
            source_uri=str(Path(path).resolve()),
        )

    async def ingest_text(
        self,
        text: str,
        *,
        owner_id: str | None,
        title: str,
        tags: Iterable[str] | None = None,
        metadata: dict | None = None,
    ) -> IngestionResult:
        loader = get_loader("text")
        return await self._ingest_loader_result(
            loader.load_bytes(text.encode("utf-8"), filename=title),
            owner_id=owner_id,
            title=title,
            tags=tags,
            metadata=metadata,
        )

    async def ingest_url(
        self,
        url: str,
        *,
        owner_id: str | None,
        title: str | None = None,
        tags: Iterable[str] | None = None,
        metadata: dict | None = None,
    ) -> IngestionResult:
        loader = get_loader(url)
        return await self._ingest_loader_result(
            loader.load_url(url),
            owner_id=owner_id,
            title=title or url,
            tags=tags,
            metadata=metadata,
            source_uri=url,
        )

    # ------------------------------------------------------------------

    async def _ingest_loader_result(
        self,
        result: LoaderResult,
        *,
        owner_id: str | None,
        title: str | None,
        tags: Iterable[str] | None,
        metadata: dict | None,
        source_uri: str | None = None,
    ) -> IngestionResult:
        if not result.documents:
            raise IndexingError("Loader returned no documents.")
        primary = result.documents[0]
        from app.schemas.document import DocumentCreate

        payload = DocumentCreate(
            title=title or primary.title or "untitled",
            source_type="upload" if source_uri is None else "url",
            source_uri=source_uri,
            content_type=result.content_type,
            language=primary.metadata.get("language"),
            tags=list(tags or ()),
            metadata=dict(metadata or {}),
        )
        document = await self.docs.create(
            owner_id,
            payload,
            size_bytes=result.size_bytes,
            checksum=result.checksum,
            text=primary.text,
        )
        return await self._index_documents(document, result.documents)

    async def _index_documents(
        self,
        document: Document,
        rag_documents: list[RAGDocument],
    ) -> IngestionResult:
        chunker = get_chunker(
            self.settings.chunker,
            chunk_size=self.settings.chunk_size,
            chunk_overlap=self.settings.chunk_overlap,
        )
        chunks = chunker.chunk_many(rag_documents)
        if not chunks:
            await self.docs.mark_failed(document, error="No chunks produced.")
            return IngestionResult(
                document=document, job=None, chunks_indexed=0, embeddings_created=0, duration_ms=0.0
            )
        started = asyncio.get_event_loop().time()
        embeddings = await self.embedder.aembed_many([chunk.text for chunk in chunks])
        items: list[VectorStoreItem] = []
        chunk_rows: list[Chunk] = []
        token_total = 0
        for index, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            row = Chunk(
                document_id=document.id,
                chunk_index=index,
                text=chunk.text,
                token_count=len(chunk.text.split()),
                char_start=chunk.char_start,
                char_end=chunk.char_end,
                embedding_id=f"{document.id}:{index}",
                metadata=dict(chunk.metadata),
            )
            chunk_rows.append(row)
            token_total += row.token_count
            items.append(
                VectorStoreItem(
                    id=row.embedding_id,
                    text=chunk.text,
                    embedding=embedding.vector,
                    metadata={
                        "document_id": document.id,
                        "document_title": document.title,
                        "chunk_index": index,
                        **(chunk.metadata or {}),
                    },
                )
            )
        await self.chunks_repo.add_all(chunk_rows)
        await self.vector_store.aupsert(items)
        await self.docs.mark_indexed(document, chunk_count=len(chunk_rows), token_count=token_total)
        duration = (asyncio.get_event_loop().time() - started) * 1000
        job = IngestionJob(
            document_id=document.id,
            status="succeeded",
            chunks_processed=len(chunk_rows),
            embeddings_created=len(embeddings),
            progress=1.0,
            started_at=utc_now(),
            finished_at=utc_now(),
            result={"duration_ms": duration},
        )
        await self.jobs_repo.create(job)
        return IngestionResult(
            document=document,
            job=job,
            chunks_indexed=len(chunk_rows),
            embeddings_created=len(embeddings),
            duration_ms=duration,
        )


__all__ = ["IngestionResult", "IngestionService"]
