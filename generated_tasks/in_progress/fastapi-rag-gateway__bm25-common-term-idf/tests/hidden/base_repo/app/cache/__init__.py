"""Cache abstractions."""

from __future__ import annotations

from app.cache.backend import CacheBackend, InMemoryCache, RedisCache, get_cache
from app.cache.serializers import json_dumps, json_loads

__all__ = [
    "CacheBackend",
    "InMemoryCache",
    "RedisCache",
    "get_cache",
    "json_dumps",
    "json_loads",
]
