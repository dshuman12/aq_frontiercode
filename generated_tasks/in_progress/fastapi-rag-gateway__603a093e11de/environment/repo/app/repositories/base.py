"""Generic repository base class."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from typing import Any, Generic, TypeVar

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from app.core.exceptions import NotFoundError
from app.core.pagination import Page, PageRequest
from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Async CRUD repository on top of SQLAlchemy."""

    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get(self, primary_key: Any) -> ModelT | None:
        return await self.session.get(self.model, primary_key)

    async def get_or_404(self, primary_key: Any) -> ModelT:
        instance = await self.get(primary_key)
        if instance is None:
            raise NotFoundError(
                f"{self.model.__name__} {primary_key!r} not found.",
            )
        return instance

    async def find_one(self, *whereclauses: Any) -> ModelT | None:
        stmt = select(self.model)
        if whereclauses:
            stmt = stmt.where(*whereclauses)
        result = await self.session.execute(stmt.limit(1))
        return result.scalars().first()

    async def find_all(
        self,
        *whereclauses: Any,
        order_by: Iterable[Any] = (),
        limit: int | None = None,
        offset: int | None = None,
    ) -> Sequence[ModelT]:
        stmt: Select = select(self.model)
        if whereclauses:
            stmt = stmt.where(*whereclauses)
        if order_by:
            stmt = stmt.order_by(*order_by)
        if limit is not None:
            stmt = stmt.limit(limit)
        if offset is not None:
            stmt = stmt.offset(offset)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def count(self, *whereclauses: Any) -> int:
        stmt = select(func.count()).select_from(self.model)
        if whereclauses:
            stmt = stmt.where(*whereclauses)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def page(
        self,
        request: PageRequest,
        *whereclauses: Any,
        order_by: Iterable[Any] = (),
    ) -> Page[ModelT]:
        request = request.normalised()
        items = await self.find_all(
            *whereclauses,
            order_by=order_by,
            limit=request.size,
            offset=request.offset,
        )
        total = await self.count(*whereclauses)
        return Page(
            items=list(items),
            total=total,
            page=request.page,
            size=request.size,
            sort=request.sort,
            direction=request.direction,
        )

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create(self, obj: ModelT, *, flush: bool = True) -> ModelT:
        self.session.add(obj)
        if flush:
            await self.session.flush()
        return obj

    async def add_all(self, objs: Iterable[ModelT], *, flush: bool = True) -> None:
        materialised = list(objs)
        if not materialised:
            return
        self.session.add_all(materialised)
        if flush:
            await self.session.flush()

    async def delete(self, obj: ModelT) -> None:
        await self.session.delete(obj)
        await self.session.flush()

    async def delete_where(self, *whereclauses: Any) -> int:
        stmt = delete(self.model)
        if whereclauses:
            stmt = stmt.where(*whereclauses)
        result = await self.session.execute(stmt)
        return int(result.rowcount or 0)

    async def refresh(self, obj: ModelT) -> ModelT:
        await self.session.refresh(obj)
        return obj


__all__ = ["BaseRepository", "ModelT"]
