"""Cache backends.

Provides an :class:`InMemoryCache` with a TTL bookkeeping for
single-process deployments and a :class:`RedisCache` for multi-instance
deployments. The factory :func:`get_cache` reads the application
settings and returns the right implementation.
"""

from __future__ import annotations

import threading
import time
from abc import ABC, abstractmethod
from typing import Any

from app.core.config import Settings, get_settings


class CacheBackend(ABC):
    """Common interface for synchronous + async cache backends."""

    @abstractmethod
    def get(self, key: str) -> Any | None: ...

    @abstractmethod
    def set(self, key: str, value: Any, *, ttl: int | None = None) -> None: ...

    @abstractmethod
    def delete(self, key: str) -> None: ...

    @abstractmethod
    def clear(self) -> None: ...

    async def aget(self, key: str) -> Any | None:
        return self.get(key)

    async def aset(self, key: str, value: Any, *, ttl: int | None = None) -> None:
        self.set(key, value, ttl=ttl)

    async def adelete(self, key: str) -> None:
        self.delete(key)


class InMemoryCache(CacheBackend):
    """Thread-safe TTL cache backed by a dict."""

    def __init__(self, *, default_ttl: int = 300) -> None:
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()
        self._default_ttl = default_ttl

    def get(self, key: str) -> Any | None:
        with self._lock:
            row = self._store.get(key)
            if row is None:
                return None
            expires_at, value = row
            if expires_at and expires_at < time.time():
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any, *, ttl: int | None = None) -> None:
        with self._lock:
            ttl_seconds = ttl if ttl is not None else self._default_ttl
            expires_at = time.time() + ttl_seconds if ttl_seconds else 0.0
            self._store[key] = (expires_at, value)

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def keys(self) -> list[str]:
        with self._lock:
            return list(self._store.keys())


class RedisCache(CacheBackend):
    """Redis-backed cache.

    The Redis client is created lazily so the rest of the application can
    be imported in environments without Redis. The cache silently falls
    back to a no-op when the connection cannot be established.
    """

    def __init__(self, url: str, *, default_ttl: int = 300) -> None:
        self.url = url
        self.default_ttl = default_ttl
        self._client = None
        self._init_error: str | None = None

    def _ensure_client(self):
        if self._client is not None:
            return self._client
        try:  # pragma: no cover - optional dep
            import redis  # type: ignore[import]

            self._client = redis.Redis.from_url(self.url, decode_responses=True)
            return self._client
        except Exception as exc:  # pragma: no cover - optional dep
            self._init_error = str(exc)
            return None

    def _serialise(self, value: Any) -> str:
        from app.cache.serializers import json_dumps

        return json_dumps(value)

    def _deserialise(self, value: Any) -> Any:
        from app.cache.serializers import json_loads

        if value is None:
            return None
        return json_loads(value)

    def get(self, key: str) -> Any | None:
        client = self._ensure_client()
        if client is None:
            return None
        try:
            return self._deserialise(client.get(key))
        except Exception:
            return None

    def set(self, key: str, value: Any, *, ttl: int | None = None) -> None:
        client = self._ensure_client()
        if client is None:
            return
        ttl_seconds = ttl if ttl is not None else self.default_ttl
        try:
            client.set(key, self._serialise(value), ex=ttl_seconds)
        except Exception:
            return

    def delete(self, key: str) -> None:
        client = self._ensure_client()
        if client is None:
            return
        try:
            client.delete(key)
        except Exception:
            return

    def clear(self) -> None:
        client = self._ensure_client()
        if client is None:
            return
        try:
            client.flushdb()
        except Exception:
            return


_default_cache: CacheBackend | None = None


def get_cache(settings: Settings | None = None) -> CacheBackend:
    """Return the application cache, creating it on first call."""

    global _default_cache
    if _default_cache is not None:
        return _default_cache
    settings = settings or get_settings()
    if not settings.cache_enabled:
        _default_cache = InMemoryCache(default_ttl=settings.redis_default_ttl_seconds)
        return _default_cache
    if settings.redis_url:
        _default_cache = RedisCache(
            settings.redis_url,
            default_ttl=settings.redis_default_ttl_seconds,
        )
    else:
        _default_cache = InMemoryCache(default_ttl=settings.redis_default_ttl_seconds)
    return _default_cache


__all__ = ["CacheBackend", "InMemoryCache", "RedisCache", "get_cache"]
