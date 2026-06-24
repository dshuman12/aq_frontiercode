"""Document repository."""

from __future__ import annotations

from collections.abc import Iterable, Sequence

from sqlalchemy import select

from app.core.pagination import Page, PageRequest
from app.models.document import Document
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    model = Document

    async def list_for_owner(
        self,
        owner_id: str,
        request: PageRequest,
        *,
        statuses: Iterable[str] | None = None,
        tag: str | None = None,
    ) -> Page[Document]:
        whereclauses = [Document.owner_id == owner_id, Document.deleted_at.is_(None)]
        if statuses:
            whereclauses.append(Document.status.in_(tuple(statuses)))
        return await self.page(
            request,
            *whereclauses,
            order_by=(Document.created_at.desc(),),
        )

    async def get_by_checksum(self, owner_id: str | None, checksum: str) -> Document | None:
        return await self.find_one(
            Document.owner_id == owner_id,
            Document.checksum == checksum,
        )

    async def update_status(
        self,
        document: Document,
        *,
        status: str,
        error: str | None = None,
    ) -> Document:
        document.status = status
        document.error = error
        await self.session.flush()
        return document

    async def fetch_for_indexing(self, limit: int = 25) -> Sequence[Document]:
        result = await self.session.execute(
            select(Document)
            .where(Document.status == "pending", Document.deleted_at.is_(None))
            .limit(limit)
        )
        return result.scalars().all()
