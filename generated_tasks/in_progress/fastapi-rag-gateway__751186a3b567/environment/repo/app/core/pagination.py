"""Pagination helpers shared across API endpoints."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from math import ceil
from typing import Any, Generic, TypeVar

from app.core.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

T = TypeVar("T")


@dataclass(slots=True)
class PageRequest:
    """Inputs that describe a desired page of results."""

    page: int = 1
    size: int = DEFAULT_PAGE_SIZE
    sort: str | None = None
    direction: str = "asc"

    def normalised(self) -> PageRequest:
        page = max(1, int(self.page or 1))
        size = max(1, min(int(self.size or DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE))
        direction = "desc" if str(self.direction).lower() == "desc" else "asc"
        return PageRequest(page=page, size=size, sort=self.sort, direction=direction)

    @property
    def offset(self) -> int:
        return (max(1, self.page) - 1) * max(1, self.size)


@dataclass(slots=True)
class Page(Generic[T]):
    """Concrete page of items plus pagination metadata."""

    items: list[T] = field(default_factory=list)
    total: int = 0
    page: int = 1
    size: int = DEFAULT_PAGE_SIZE
    sort: str | None = None
    direction: str = "asc"

    @property
    def pages(self) -> int:
        if not self.size:
            return 0
        return max(1, self.total // self.size)

    @property
    def has_next(self) -> bool:
        return self.page < self.pages

    @property
    def has_prev(self) -> bool:
        return self.page > 1

    def to_dict(self) -> dict[str, Any]:
        return {
            "items": list(self.items),
            "page": self.page,
            "size": self.size,
            "total": self.total,
            "pages": self.pages,
            "sort": self.sort,
            "direction": self.direction,
            "has_next": self.has_next,
            "has_prev": self.has_prev,
        }


def paginate_in_memory(
    iterable: Iterable[T],
    request: PageRequest | None = None,
) -> Page[T]:
    """Apply :class:`PageRequest` semantics to an in-memory iterable."""

    request = (request or PageRequest()).normalised()
    materialised: Sequence[T] = iterable if isinstance(iterable, Sequence) else list(iterable)
    total = len(materialised)
    items = list(materialised[request.offset : request.offset + request.size])
    return Page(
        items=items,
        total=total,
        page=request.page,
        size=request.size,
        sort=request.sort,
        direction=request.direction,
    )


__all__ = ["PageRequest", "Page", "paginate_in_memory"]
