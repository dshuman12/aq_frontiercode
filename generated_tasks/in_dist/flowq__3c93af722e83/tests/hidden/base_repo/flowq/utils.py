"""Utility functions for FlowQ."""

from __future__ import annotations

import functools
import hashlib
import json
import random
import time
from typing import Any, Callable, Optional, Type, Union


# ── Retry helpers ──────────────────────────────────────────────────────────

def retry(
    max_attempts: int = 3,
    exceptions: tuple = (Exception,),
    base_delay: float = 0.5,
    backoff: float = 2.0,
    jitter: bool = True,
) -> Callable:
    """Decorator that retries the wrapped function on failure.

    Args:
        max_attempts: Total attempts (including the first).
        exceptions: Tuple of exception types to catch.
        base_delay: Initial wait between attempts in seconds.
        backoff: Multiplier applied to delay after each failure.
        jitter: Add ±25% random jitter to avoid thundering herd.
    """
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            delay = base_delay
            last_exc = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as exc:
                    last_exc = exc
                    if attempt == max_attempts:
                        break
                    sleep = delay * (1 + (random.uniform(-0.25, 0.25) if jitter else 0))
                    time.sleep(sleep)
                    delay *= backoff
            raise last_exc
        return wrapper
    return decorator


def exponential_backoff(attempt: int, base: float = 1.0, cap: float = 60.0,
                        jitter: bool = True) -> float:
    """Return the wait time (seconds) for *attempt* (1-indexed)."""
    delay = min(cap, base * (2 ** (attempt - 1)))
    if jitter:
        delay *= random.uniform(0.75, 1.25)
    return delay


# ── Payload helpers ────────────────────────────────────────────────────────

def safe_json_dumps(obj: Any, fallback: str = "{}") -> str:
    """Serialize *obj* to JSON; return *fallback* on failure."""
    try:
        return json.dumps(obj, default=str)
    except (TypeError, ValueError):
        return fallback


def safe_json_loads(s: str, fallback: Any = None) -> Any:
    """Deserialize JSON string; return *fallback* on failure."""
    try:
        return json.loads(s)
    except (json.JSONDecodeError, TypeError):
        return fallback


def payload_fingerprint(payload: dict) -> str:
    """Return a stable SHA-256 hex digest of *payload* for deduplication."""
    serialised = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(serialised.encode()).hexdigest()


# ── Miscellaneous ──────────────────────────────────────────────────────────

def chunk(lst: list, size: int):
    """Yield successive *size*-sized chunks from *lst*."""
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


def clamp(value: float, lo: float, hi: float) -> float:
    """Clamp *value* to the inclusive range [lo, hi]."""
    return max(lo, min(hi, value))


def format_duration(seconds: float) -> str:
    """Human-readable duration string, e.g. '2h 3m 4s'."""
    seconds = int(seconds)
    parts = []
    for unit, secs in (("h", 3600), ("m", 60), ("s", 1)):
        if seconds >= secs:
            parts.append(f"{seconds // secs}{unit}")
            seconds %= secs
    return " ".join(parts) if parts else "0s"


class Singleton:
    """Base class for singleton objects."""
    _instance = None
    _lock = None

    def __new__(cls, *args, **kwargs):
        import threading
        if cls._lock is None:
            cls._lock = threading.Lock()
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
        return cls._instance
