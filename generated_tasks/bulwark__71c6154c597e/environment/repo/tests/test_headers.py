"""Tests for the case-insensitive header multimap."""

from __future__ import annotations

import pytest

from bulwark.headers import Headers


def test_get_is_case_insensitive() -> None:
    h = Headers([("Content-Type", "text/plain")])
    assert h.get("content-type") == "text/plain"
    assert h.get("CONTENT-TYPE") == "text/plain"
    assert h.get("Content-Type") == "text/plain"


def test_first_value_wins_for_get() -> None:
    h = Headers([("X", "a"), ("x", "b")])
    assert h.get("X") == "a"


def test_get_all_returns_in_order() -> None:
    h = Headers([("X", "a"), ("Y", "z"), ("x", "b")])
    assert h.get_all("X") == ["a", "b"]


def test_set_replaces_all_keeping_first_casing() -> None:
    h = Headers([("X-Token", "old"), ("y", "1"), ("x-TOKEN", "older")])
    h.set("X-TOKEN", "new")
    items = h.items()
    # Only one entry for the casefold-equal key, with the original casing.
    matches = [(n, v) for n, v in items if n.lower() == "x-token"]
    assert matches == [("X-Token", "new")]


def test_delete_removes_all() -> None:
    h = Headers([("X", "a"), ("x", "b"), ("Y", "z")])
    h.delete("X")
    assert "X" not in h
    assert h.get_all("y") == ["z"]


def test_joined_combines_values_with_comma_space() -> None:
    h = Headers([("Accept", "text/plain"), ("accept", "text/html")])
    assert h.joined("accept") == "text/plain, text/html"


def test_joined_returns_none_for_absent() -> None:
    h = Headers()
    assert h.joined("Content-Type") is None


def test_joined_refuses_set_cookie() -> None:
    h = Headers([("Set-Cookie", "a=1"), ("set-cookie", "b=2")])
    with pytest.raises(ValueError):
        h.joined("set-cookie")
    assert h.get_all("set-cookie") == ["a=1", "b=2"]


def test_no_unicode_casefold_pitfall() -> None:
    # German sharp-s (ß) should NOT casefold to "ss" for header lookup
    # purposes; we use plain ASCII lower.
    h = Headers([("Cookieß", "1")])
    assert h.get("cookiess") is None  # would be "1" if we used casefold
    assert h.get("Cookieß") == "1"
