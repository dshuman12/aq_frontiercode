"""Tests for nexusflow.db.caching.QueryCache."""

import time
import pytest

from nexusflow.db.caching import CacheEntry, CacheStats, QueryCache


class TestQueryCacheBasics:
    """Tests for basic cache get/put operations."""

    def test_put_and_get(self, query_cache):
        query_cache.put("SELECT 1", result=[{"val": 1}])
        result = query_cache.get("SELECT 1")
        assert result == [{"val": 1}]

    def test_get_miss_returns_none(self, query_cache):
        result = query_cache.get("SELECT 999")
        assert result is None

    def test_put_with_params(self, query_cache):
        query_cache.put("SELECT * FROM users WHERE id = $1", result={"id": 1}, params={"id": 1})
        result = query_cache.get("SELECT * FROM users WHERE id = $1", params={"id": 1})
        assert result == {"id": 1}

    def test_different_params_different_keys(self, query_cache):
        query_cache.put("SELECT * FROM users WHERE id = $1", result="A", params={"id": 1})
        query_cache.put("SELECT * FROM users WHERE id = $1", result="B", params={"id": 2})
        assert query_cache.get("SELECT * FROM users WHERE id = $1", params={"id": 1}) == "A"
        assert query_cache.get("SELECT * FROM users WHERE id = $1", params={"id": 2}) == "B"


class TestQueryCacheTTL:
    """Tests for TTL-based expiration."""

    def test_entry_expires_after_ttl(self):
        cache = QueryCache(max_size=100, default_ttl=1)
        cache.put("SELECT 1", result="data")
        time.sleep(1.5)
        assert cache.get("SELECT 1") is None

    def test_custom_ttl_per_entry(self, query_cache):
        query_cache.put("SELECT 1", result="short", ttl=1)
        query_cache.put("SELECT 2", result="long", ttl=60)
        time.sleep(1.5)
        assert query_cache.get("SELECT 1") is None
        assert query_cache.get("SELECT 2") == "long"

    def test_expired_entry_counted_as_miss(self):
        cache = QueryCache(max_size=100, default_ttl=1)
        cache.put("Q", result="val")
        time.sleep(1.5)
        cache.get("Q")
        assert cache._stats.misses >= 1


class TestQueryCacheLRUEviction:
    """Tests for LRU eviction when cache reaches max size."""

    def test_eviction_at_capacity(self):
        cache = QueryCache(max_size=3, default_ttl=300)
        cache.put("Q1", result="v1")
        cache.put("Q2", result="v2")
        cache.put("Q3", result="v3")
        # Adding Q4 should evict Q1 (oldest)
        cache.put("Q4", result="v4")
        assert cache.get("Q1") is None
        assert cache.get("Q4") == "v4"

    def test_recently_accessed_not_evicted(self):
        cache = QueryCache(max_size=3, default_ttl=300)
        cache.put("Q1", result="v1")
        cache.put("Q2", result="v2")
        cache.put("Q3", result="v3")
        # Access Q1 to move it to the end
        cache.get("Q1")
        cache.put("Q4", result="v4")
        # Q2 should be evicted (oldest un-accessed)
        assert cache.get("Q1") == "v1"
        assert cache.get("Q2") is None


class TestQueryCacheInvalidation:
    """Tests for cache invalidation."""

    def test_stats_tracking(self, query_cache):
        query_cache.put("Q1", result="v1")
        query_cache.get("Q1")  # hit
        query_cache.get("Q2")  # miss
        stats = query_cache._stats
        assert stats.hits >= 1
        assert stats.misses >= 1
        assert stats.hit_rate > 0

    def test_stats_reset(self, query_cache):
        query_cache.put("Q1", result="v1")
        query_cache.get("Q1")
        query_cache._stats.reset()
        assert query_cache._stats.hits == 0
        assert query_cache._stats.misses == 0

    def test_cache_entry_touch(self):
        entry = CacheEntry(
            key="k", value="v", created_at=time.time(), ttl=300
        )
        assert entry.access_count == 0
        entry.touch()
        assert entry.access_count == 1
        assert entry.last_accessed > 0

    def test_cache_entry_is_expired(self):
        entry = CacheEntry(
            key="k", value="v", created_at=time.time() - 10, ttl=5
        )
        assert entry.is_expired is True

    def test_cache_entry_not_expired_when_ttl_zero(self):
        entry = CacheEntry(
            key="k", value="v", created_at=time.time() - 100, ttl=0
        )
        assert entry.is_expired is False
