"""Cache tests."""

from __future__ import annotations

import time

from app.cache.backend import InMemoryCache


def test_cache_set_get_delete() -> None:
    cache = InMemoryCache(default_ttl=10)
    cache.set("k", {"a": 1})
    assert cache.get("k") == {"a": 1}
    cache.delete("k")
    assert cache.get("k") is None


def test_cache_expires() -> None:
    cache = InMemoryCache(default_ttl=10)
    cache.set("k", "v", ttl=0)
    cache.set("z", "v")
    cache._store["k"] = (time.time() - 1, "v")  # type: ignore[attr-defined]
    assert cache.get("k") is None
    assert cache.get("z") == "v"
