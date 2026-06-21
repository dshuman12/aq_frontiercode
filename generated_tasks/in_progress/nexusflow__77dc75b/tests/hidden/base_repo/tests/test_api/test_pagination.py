"""Tests for nexusflow.api.pagination."""

import pytest

from nexusflow.api.pagination import (
    CursorEncoder,
    CursorPaginator,
    OffsetPaginator,
    Page,
    PageInfo,
)


@pytest.fixture
def sample_items():
    return [{"id": i, "name": f"item-{i}"} for i in range(1, 51)]


class TestOffsetPaginator:
    """Tests for offset-based pagination."""

    def test_first_page(self, sample_items):
        paginator = OffsetPaginator(default_page_size=10)
        page = paginator.paginate(sample_items, page=1)
        assert len(page.items) == 10
        assert page.page_info.current_page == 1
        assert page.page_info.has_next is True
        assert page.page_info.has_previous is False

    def test_last_page(self, sample_items):
        paginator = OffsetPaginator(default_page_size=10)
        page = paginator.paginate(sample_items, page=5)
        assert len(page.items) == 10
        assert page.page_info.has_next is False
        assert page.page_info.has_previous is True

    def test_custom_page_size(self, sample_items):
        paginator = OffsetPaginator(default_page_size=10, max_page_size=100)
        page = paginator.paginate(sample_items, page=1, page_size=25)
        assert len(page.items) == 25

    def test_page_size_capped_at_max(self, sample_items):
        paginator = OffsetPaginator(default_page_size=10, max_page_size=15)
        page = paginator.paginate(sample_items, page=1, page_size=100)
        assert len(page.items) == 15

    def test_total_pages_calculated(self, sample_items):
        paginator = OffsetPaginator(default_page_size=10)
        page = paginator.paginate(sample_items, page=1)
        assert page.page_info.total_pages == 5
        assert page.page_info.total_count == 50

    def test_page_zero_treated_as_one(self, sample_items):
        paginator = OffsetPaginator(default_page_size=10)
        page = paginator.paginate(sample_items, page=0)
        assert page.page_info.current_page == 1

    def test_beyond_last_page_empty(self, sample_items):
        paginator = OffsetPaginator(default_page_size=10)
        page = paginator.paginate(sample_items, page=100)
        assert len(page.items) == 0

    def test_page_range(self):
        paginator = OffsetPaginator()
        rng = paginator.get_page_range(current=5, total=20, window=5)
        assert 5 in rng
        assert len(rng) == 5


class TestCursorEncoder:
    """Tests for cursor encoding/decoding."""

    def test_encode_decode_roundtrip(self):
        encoder = CursorEncoder()
        data = {"id": 42, "sort": "name"}
        cursor = encoder.encode(data)
        decoded = encoder.decode(cursor)
        assert decoded == data

    def test_tampered_cursor_returns_none(self):
        encoder = CursorEncoder()
        cursor = encoder.encode({"id": 1})
        tampered = cursor[:-2] + "XX"
        assert encoder.decode(tampered) is None

    def test_invalid_cursor_returns_none(self):
        encoder = CursorEncoder()
        assert encoder.decode("not-a-valid-cursor!!!") is None


class TestPageInfo:
    """Tests for PageInfo and Page data classes."""

    def test_page_info_to_dict(self):
        info = PageInfo(
            has_next=True, has_previous=False, total_count=100,
            page_size=20, current_page=1, total_pages=5,
        )
        d = info.to_dict()
        assert d["has_next"] is True
        assert d["total_count"] == 100

    def test_page_to_dict_with_serializer(self):
        items = [{"id": 1}, {"id": 2}]
        page = Page(items=items, page_info=PageInfo(has_next=False, has_previous=False))
        d = page.to_dict(item_serializer=lambda x: {"ID": x["id"]})
        assert d["items"][0]["ID"] == 1
