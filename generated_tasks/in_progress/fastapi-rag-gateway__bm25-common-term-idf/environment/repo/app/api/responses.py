"""Response helpers used by the API layer."""

from __future__ import annotations

from collections.abc import Iterable
from typing import TypeVar

from app.core.pagination import Page
from app.schemas.common import PageEnvelope

T = TypeVar("T")


def to_envelope(page: Page, items: Iterable[T]) -> PageEnvelope[T]:
    materialised = list(items)
    return PageEnvelope[T](
        items=materialised,
        page=page.page,
        size=page.size,
        total=page.total,
        pages=page.pages,
        has_next=page.has_next,
        has_prev=page.has_prev,
    )


__all__ = ["to_envelope"]
