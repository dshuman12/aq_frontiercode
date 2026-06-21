"""
nexusflow.db.caching
~~~~~~~~~~~~~~~~~~~~

Query result cache with LRU eviction, TTL-based expiration, and
cache invalidation support. Integrates with the transaction system
to provide consistent reads.
"""

from __future__ import annotations

import hashlib
import json
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set, Tuple


@dataclass
class CacheEntry:
    """A single cache entry with metadata."""
    key: str
    value: Any
    created_at: float
    ttl: float
    access_count: int = 0
    last_accessed: float = 0.0
    tags: Set[str] = field(default_factory=set)
    transaction_id: Optional[str] = None

    @property
    def is_expired(self) -> bool:
        """Check if this entry has expired based on TTL."""
        if self.ttl <= 0:
            return False
        return (time.time() - self.created_at) > self.ttl

    @property
    def age(self) -> float:
        """Return the age of this entry in seconds."""
        return time.time() - self.created_at

    def touch(self) -> None:
        """Update access metadata."""
        self.access_count += 1
        self.last_accessed = time.time()


class CacheStats:
    """Track cache hit/miss statistics."""

    def __init__(self) -> None:
        self.hits: int = 0
        self.misses: int = 0
        self.evictions: int = 0
        self.invalidations: int = 0
        self.expirations: int = 0

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        if total == 0:
            return 0.0
        return self.hits / total

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hits": self.hits,
            "misses": self.misses,
            "evictions": self.evictions,
            "invalidations": self.invalidations,
            "expirations": self.expirations,
            "hit_rate": round(self.hit_rate, 4),
        }

    def reset(self) -> None:
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        self.invalidations = 0
        self.expirations = 0


class QueryCache:
    """
    LRU cache with TTL for query results.

    Supports cache tags for group invalidation and integrates
    with the transaction system.
    """

    def __init__(
        self,
        max_size: int = 1000,
        default_ttl: float = 300.0,
    ) -> None:
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._tag_index: Dict[str, Set[str]] = {}
        self._stats = CacheStats()
        self._lock = threading.RLock()
        self._invalidation_callbacks: List[Callable[[str], None]] = []
        self._transaction_entries: Dict[str, Set[str]] = {}

    @staticmethod
    def _make_key(query: str, params: Optional[Dict[str, Any]] = None) -> str:
        """Generate a cache key from a query and its parameters."""
        raw = query
        if params:
            raw += json.dumps(params, sort_keys=True, default=str)
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Optional[Any]:
        """
        Get a cached query result.

        Returns None on cache miss.
        """
        key = self._make_key(query, params)
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                self._stats.misses += 1
                return None
            if entry.is_expired:
                self._remove(key)
                self._stats.expirations += 1
                self._stats.misses += 1
                return None
            entry.touch()
            self._cache.move_to_end(key)
            self._stats.hits += 1
            return entry.value

    def put(
        self,
        query: str,
        result: Any,
        params: Optional[Dict[str, Any]] = None,
        ttl: Optional[float] = None,
        tags: Optional[Set[str]] = None,
        transaction_id: Optional[str] = None,
    ) -> str:
        """
        Cache a query result.
        """
        key = self._make_key(query, params)
        effective_ttl = ttl if ttl is not None else self._default_ttl
        entry_tags = tags or set()

        with self._lock:
            # Evict if at capacity
            while len(self._cache) >= self._max_size:
                self._evict_one()

            entry = CacheEntry(
                key=key,
                value=result,
                created_at=time.time(),
                ttl=effective_ttl,
                tags=entry_tags,
                transaction_id=transaction_id,
            )
            self._cache[key] = entry
            self._cache.move_to_end(key)

            # Update tag index
            for tag in entry_tags:
                if tag not in self._tag_index:
                    self._tag_index[tag] = set()
                self._tag_index[tag].add(key)

            if transaction_id:
                if transaction_id not in self._transaction_entries:
                    self._transaction_entries[transaction_id] = set()
                self._transaction_entries[transaction_id].add(key)

        return key

    def invalidate(self, query: str, params: Optional[Dict[str, Any]] = None) -> bool:
        """Invalidate a specific cached query."""
        key = self._make_key(query, params)
        with self._lock:
            if key in self._cache:
                self._remove(key)
                self._stats.invalidations += 1
                return True
        return False

    def invalidate_by_tag(self, tag: str) -> int:
        """Invalidate all entries with a given tag."""
        count = 0
        with self._lock:
            keys = self._tag_index.get(tag, set()).copy()
            for key in keys:
                if key in self._cache:
                    self._remove(key)
                    count += 1
                    self._stats.invalidations += 1
        return count

    def invalidate_by_table(self, table_name: str) -> int:
        """Invalidate all entries related to a table."""
        return self.invalidate_by_tag(f"table:{table_name}")

    def on_transaction_rollback(self, transaction_id: str) -> int:
        """
        Handle transaction rollback — should invalidate cached results
        from that transaction.
        """
        count = 0
        with self._lock:
            keys = self._transaction_entries.get(transaction_id, set()).copy()
            for key in keys:
                if key in self._cache:
                    self._remove(key)
                    count += 1
            if transaction_id in self._transaction_entries:
                del self._transaction_entries[transaction_id]
        return count

    def clear(self) -> None:
        """Clear the entire cache."""
        with self._lock:
            self._cache.clear()
            self._tag_index.clear()
            self._transaction_entries.clear()

    def _remove(self, key: str) -> None:
        """Remove a single entry from the cache."""
        entry = self._cache.pop(key, None)
        if entry:
            for tag in entry.tags:
                tag_keys = self._tag_index.get(tag)
                if tag_keys:
                    tag_keys.discard(key)
                    if not tag_keys:
                        del self._tag_index[tag]
            for cb in self._invalidation_callbacks:
                try:
                    cb(key)
                except Exception:
                    pass

    def _evict_one(self) -> None:
        """Evict the least recently used entry."""
        if self._cache:
            key, _ = self._cache.popitem(last=False)
            self._stats.evictions += 1

    def cleanup_expired(self) -> int:
        """Remove all expired entries. Returns count of removed entries."""
        count = 0
        with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items()
                if entry.is_expired
            ]
            for key in expired_keys:
                self._remove(key)
                count += 1
                self._stats.expirations += 1
        return count

    def on_invalidation(self, callback: Callable[[str], None]) -> None:
        """Register a callback for cache invalidation events."""
        self._invalidation_callbacks.append(callback)

    def get_stats(self) -> Dict[str, Any]:
        """Return cache statistics."""
        with self._lock:
            stats = self._stats.to_dict()
            stats["size"] = len(self._cache)
            stats["max_size"] = self._max_size
            stats["tag_count"] = len(self._tag_index)
            return stats

    def get_keys(self) -> List[str]:
        """Return all cache keys."""
        with self._lock:
            return list(self._cache.keys())

    def __len__(self) -> int:
        return len(self._cache)

    def __contains__(self, key: str) -> bool:
        with self._lock:
            entry = self._cache.get(key)
            if entry and not entry.is_expired:
                return True
            return False


class CacheManager:
    """Manages multiple cache instances for different purposes."""

    def __init__(self) -> None:
        self._caches: Dict[str, QueryCache] = {}
        self._default_cache = QueryCache()

    def get_cache(self, name: str = "default") -> QueryCache:
        """Get or create a named cache instance."""
        if name == "default":
            return self._default_cache
        if name not in self._caches:
            self._caches[name] = QueryCache()
        return self._caches[name]

    def clear_all(self) -> None:
        """Clear all caches."""
        self._default_cache.clear()
        for cache in self._caches.values():
            cache.clear()

    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Return stats for all caches."""
        stats: Dict[str, Dict[str, Any]] = {
            "default": self._default_cache.get_stats(),
        }
        for name, cache in self._caches.items():
            stats[name] = cache.get_stats()
        return stats

    def cleanup_all_expired(self) -> int:
        """Run cleanup on all caches."""
        count = self._default_cache.cleanup_expired()
        for cache in self._caches.values():
            count += cache.cleanup_expired()
        return count
# Performance tuning
