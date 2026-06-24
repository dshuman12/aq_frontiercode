"""Tests for the source span helpers."""

from __future__ import annotations

import pytest

from bulwark.span import Span, line_col


def test_span_construction_validates_bounds() -> None:
    Span(0, 0)
    Span(0, 5)
    with pytest.raises(ValueError):
        Span(-1, 0)
    with pytest.raises(ValueError):
        Span(5, 3)


def test_span_len_is_end_minus_start() -> None:
    assert len(Span(2, 7)) == 5
    assert len(Span(0, 0)) == 0


def test_span_merge_takes_outer_bounds() -> None:
    a = Span(2, 5)
    b = Span(7, 9)
    assert a.merge(b) == Span(2, 9)
    assert b.merge(a) == Span(2, 9)


def test_span_slice_returns_substring() -> None:
    src = "phase pre_route"
    assert Span(6, 15).slice(src) == "pre_route"


def test_line_col_first_line() -> None:
    assert line_col("hello", 0) == (1, 1)
    assert line_col("hello", 4) == (1, 5)


def test_line_col_after_newline() -> None:
    src = "ab\ncd\nef"
    assert line_col(src, 3) == (2, 1)
    assert line_col(src, 6) == (3, 1)
    assert line_col(src, 7) == (3, 2)


def test_line_col_at_eof() -> None:
    src = "abc"
    assert line_col(src, 3) == (1, 4)


def test_line_col_rejects_out_of_range() -> None:
    with pytest.raises(ValueError):
        line_col("abc", 99)
    with pytest.raises(ValueError):
        line_col("abc", -1)
