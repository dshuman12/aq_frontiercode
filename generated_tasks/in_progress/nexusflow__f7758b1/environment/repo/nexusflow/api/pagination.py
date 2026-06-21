"""
nexusflow.api.pagination
~~~~~~~~~~~~~~~~~~~~~~~~~

Cursor-based and offset pagination implementations. Supports configurable
page sizes, sorting, and cursor encoding/decoding for stateless pagination.
"""

from __future__ import annotations

import base64
import hashlib
import json
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Generic, List, Optional, Tuple, TypeVar

T = TypeVar("T")


@dataclass
class PageInfo:
    """Metadata about a page of results."""
    has_next: bool
    has_previous: bool
    total_count: Optional[int] = None
    page_size: int = 20
    current_page: Optional[int] = None
    total_pages: Optional[int] = None
    start_cursor: Optional[str] = None
    end_cursor: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "has_next": self.has_next,
            "has_previous": self.has_previous,
            "page_size": self.page_size,
        }
        if self.total_count is not None:
            result["total_count"] = self.total_count
        if self.current_page is not None:
            result["current_page"] = self.current_page
        if self.total_pages is not None:
            result["total_pages"] = self.total_pages
        if self.start_cursor is not None:
            result["start_cursor"] = self.start_cursor
        if self.end_cursor is not None:
            result["end_cursor"] = self.end_cursor
        return result


@dataclass
class Page(Generic[T]):
    """A page of results."""
    items: List[T]
    page_info: PageInfo

    def to_dict(
        self, item_serializer: Optional[Callable[[T], Any]] = None
    ) -> Dict[str, Any]:
        if item_serializer:
            items = [item_serializer(item) for item in self.items]
        else:
            items = [
                item.to_dict() if hasattr(item, "to_dict") else item
                for item in self.items
            ]
        return {
            "items": items,
            "page_info": self.page_info.to_dict(),
        }


class CursorEncoder:
    """Encodes and decodes pagination cursors."""

    def __init__(self, secret: str = "nexusflow") -> None:
        self._secret = secret

    def encode(self, data: Dict[str, Any]) -> str:
        """Encode cursor data to a string."""
        payload = json.dumps(data, sort_keys=True, default=str)
        checksum = self._checksum(payload)
        raw = f"{payload}|{checksum}"
        return base64.urlsafe_b64encode(raw.encode()).decode()

    def decode(self, cursor: str) -> Optional[Dict[str, Any]]:
        """Decode a cursor string back to data."""
        try:
            raw = base64.urlsafe_b64decode(cursor.encode()).decode()
            parts = raw.rsplit("|", 1)
            if len(parts) != 2:
                return None
            payload, checksum = parts
            if self._checksum(payload) != checksum:
                return None
            return json.loads(payload)
        except Exception:
            return None

    def _checksum(self, payload: str) -> str:
        """Generate a checksum for integrity verification."""
        h = hashlib.sha256(f"{payload}{self._secret}".encode())
        return h.hexdigest()[:12]


class OffsetPaginator:
    """Traditional offset-based pagination."""

    def __init__(
        self,
        default_page_size: int = 20,
        max_page_size: int = 100,
    ) -> None:
        self._default_page_size = default_page_size
        self._max_page_size = max_page_size

    def paginate(
        self,
        items: List[T],
        page: int = 1,
        page_size: Optional[int] = None,
        total_count: Optional[int] = None,
    ) -> Page[T]:
        """Paginate a list of items using offset-based pagination."""
        effective_size = min(
            page_size or self._default_page_size,
            self._max_page_size,
        )
        page = max(1, page)

        offset = (page - 1) * effective_size
        page_items = items[offset: offset + effective_size]

        total = total_count if total_count is not None else len(items)
        total_pages = max(1, (total + effective_size - 1) // effective_size)

        page_info = PageInfo(
            has_next=page < total_pages,
            has_previous=page > 1,
            total_count=total,
            page_size=effective_size,
            current_page=page,
            total_pages=total_pages,
        )

        return Page(items=page_items, page_info=page_info)

    def get_page_range(
        self, current: int, total: int, window: int = 5
    ) -> List[int]:
        """Calculate the range of page numbers to display."""
        half = window // 2
        start = max(1, current - half)
        end = min(total, start + window - 1)
        start = max(1, end - window + 1)
        return list(range(start, end + 1))


class CursorPaginator:
    """
    Cursor-based pagination for stable, stateless pagination.
    """

    def __init__(
        self,
        default_page_size: int = 20,
        max_page_size: int = 100,
        cursor_field: str = "id",
        ordering: str = "asc",
    ) -> None:
        self._default_page_size = default_page_size
        self._max_page_size = max_page_size
        self._cursor_field = cursor_field
        self._ordering = ordering
        self._encoder = CursorEncoder()

    def paginate(
        self,
        items: List[Any],
        after: Optional[str] = None,
        before: Optional[str] = None,
        first: Optional[int] = None,
        last: Optional[int] = None,
    ) -> Page:
        """
        Paginate items using cursor-based pagination.
        """
        page_size = min(
            first or last or self._default_page_size,
            self._max_page_size,
        )

        # Sort items
        sorted_items = self._sort_items(items)

        # Apply cursor filter
        if after:
            cursor_data = self._encoder.decode(after)
            if cursor_data:
                cursor_value = cursor_data.get("value")
                if self._ordering == "asc":
                    sorted_items = [
                        item for item in sorted_items
                        if self._get_cursor_value(item) >= cursor_value
                    ]
                else:
                    sorted_items = [
                        item for item in sorted_items
                        if self._get_cursor_value(item) <= cursor_value
                    ]

        if before:
            cursor_data = self._encoder.decode(before)
            if cursor_data:
                cursor_value = cursor_data.get("value")
                if self._ordering == "asc":
                    sorted_items = [
                        item for item in sorted_items
                        if self._get_cursor_value(item) <= cursor_value
                    ]
                else:
                    sorted_items = [
                        item for item in sorted_items
                        if self._get_cursor_value(item) >= cursor_value
                    ]

        # Slice to page size
        has_more = len(sorted_items) > page_size
        page_items = sorted_items[:page_size]

        # Build cursors
        start_cursor = None
        end_cursor = None
        if page_items:
            start_cursor = self._make_cursor(page_items[0])
            end_cursor = self._make_cursor(page_items[-1])

        page_info = PageInfo(
            has_next=has_more,
            has_previous=after is not None,
            page_size=page_size,
            start_cursor=start_cursor,
            end_cursor=end_cursor,
        )

        return Page(items=page_items, page_info=page_info)

    def _sort_items(self, items: List[Any]) -> List[Any]:
        """Sort items by the cursor field."""
        reverse = self._ordering == "desc"
        try:
            return sorted(
                items,
                key=lambda item: self._get_cursor_value(item),
                reverse=reverse,
            )
        except TypeError:
            return list(items)

    def _get_cursor_value(self, item: Any) -> Any:
        """Extract the cursor field value from an item."""
        if isinstance(item, dict):
            return item.get(self._cursor_field)
        return getattr(item, self._cursor_field, None)

    def _make_cursor(self, item: Any) -> str:
        """Create a cursor string for an item."""
        value = self._get_cursor_value(item)
        return self._encoder.encode({"value": value, "field": self._cursor_field})


class PaginationConfig:
    """Global pagination configuration."""

    def __init__(
        self,
        default_strategy: str = "offset",
        default_page_size: int = 20,
        max_page_size: int = 100,
        cursor_field: str = "id",
    ) -> None:
        self.default_strategy = default_strategy
        self.default_page_size = default_page_size
        self.max_page_size = max_page_size
        self.cursor_field = cursor_field

    def create_paginator(self) -> Union[OffsetPaginator, CursorPaginator]:
        """Create a paginator based on configuration."""
        if self.default_strategy == "cursor":
            return CursorPaginator(
                default_page_size=self.default_page_size,
                max_page_size=self.max_page_size,
                cursor_field=self.cursor_field,
            )
        return OffsetPaginator(
            default_page_size=self.default_page_size,
            max_page_size=self.max_page_size,
        )
