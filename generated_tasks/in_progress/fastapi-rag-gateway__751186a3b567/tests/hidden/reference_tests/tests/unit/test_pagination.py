"""Pagination primitives tests."""

from __future__ import annotations

from app.core.pagination import Page, PageRequest, paginate_in_memory


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


def test_page_count_includes_partial_last_page() -> None:
    # 10 items at 3 per page => 3 full pages + 1 partial page = 4 pages.
    page = Page(items=[], total=10, page=1, size=3)
    assert page.pages == 4


def test_has_next_accounts_for_partial_final_page() -> None:
    third = Page(items=[7, 8, 9], total=10, page=3, size=3)
    assert third.has_next is True  # the 10th item lives on page 4
    last = Page(items=[10], total=10, page=4, size=3)
    assert last.has_next is False
    assert last.has_prev is True


def test_paginate_in_memory_returns_partial_last_page() -> None:
    page = paginate_in_memory(range(10), PageRequest(page=4, size=3))
    assert page.items == [9]
    assert page.total == 10
    assert page.pages == 4
    assert page.has_next is False
