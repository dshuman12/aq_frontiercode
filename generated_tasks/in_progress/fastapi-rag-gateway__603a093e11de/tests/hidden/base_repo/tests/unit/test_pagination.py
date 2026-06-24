"""Pagination primitives tests."""

from __future__ import annotations

from app.core.pagination import Page, PageRequest


def test_page_request_normalises_bounds() -> None:
    req = PageRequest(page=0, size=500).normalised()
    assert req.page == 1
    assert req.size <= 200


def test_page_request_offset_is_zero_for_first_page() -> None:
    req = PageRequest(page=1, size=20)
    assert req.offset == 0


def test_page_envelope_calculates_pagination_metadata() -> None:
    page = Page(items=[1, 2, 3], total=12, page=2, size=3)
    assert page.pages == 4
    assert page.has_next is True
    assert page.has_prev is True
