"""Chunk repository."""

from __future__ import annotations

from collections.abc import Iterable, Sequence

from sqlalchemy import select

from app.models.chunk import Chunk
from app.repositories.base import BaseRepository


class ChunkRepository(BaseRepository[Chunk]):
    model = Chunk

    async def for_document(self, document_id: str) -> Sequence[Chunk]:
        result = await self.session.execute(
            select(Chunk).where(Chunk.document_id == document_id).order_by(Chunk.chunk_index.asc())
        )
        return result.scalars().all()

    async def by_ids(self, ids: Iterable[str]) -> Sequence[Chunk]:
        ids = tuple(ids)
        if not ids:
            return ()
        result = await self.session.execute(select(Chunk).where(Chunk.id.in_(ids)))
        return result.scalars().all()

    async def delete_for_document(self, document_id: str) -> int:
        return await self.delete_where(Chunk.document_id == document_id)
