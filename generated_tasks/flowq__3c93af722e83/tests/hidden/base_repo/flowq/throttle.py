"""
Concurrency throttle and semaphore utilities for FlowQ.

ConcurrencyLimiter — limits how many jobs with a given key run simultaneously.
NamedSemaphore    — named, reusable semaphore with acquire/release/context-mgr.
ThrottleGroup     — groups multiple limiters under one namespace.

Example::

    limiter = ConcurrencyLimiter(max_concurrent=3)

    with limiter.acquire("payments"):
        process_payment(job)
"""

from __future__ import annotations

import contextlib
import threading
import time
from typing import Optional


class LimitExceeded(Exception):
    """Raised when acquire() times out waiting for a slot."""


class NamedSemaphore:
    """A semaphore associated with a string key."""

    def __init__(self, key: str, count: int) -> None:
        self.key = key
        self._sem = threading.Semaphore(count)
        self._count = count
        self._in_use = 0
        self._lock = threading.Lock()

    def acquire(self, timeout: Optional[float] = None) -> bool:
        acquired = self._sem.acquire(timeout=timeout if timeout is not None else -1)
        if acquired:
            with self._lock:
                self._in_use += 1
        return acquired

    def release(self) -> None:
        self._sem.release()
        with self._lock:
            self._in_use = max(0, self._in_use - 1)

    @property
    def in_use(self) -> int:
        return self._in_use

    @property
    def available(self) -> int:
        return max(0, self._count - self._in_use)

    @contextlib.contextmanager
    def __call__(self, timeout: Optional[float] = None):
        if not self.acquire(timeout=timeout):
            raise LimitExceeded(f"Semaphore {self.key!r} timed out after {timeout}s")
        try:
            yield
        finally:
            self.release()


class ConcurrencyLimiter:
    """
    Per-key concurrency limiter using named semaphores.

    Different keys get independent semaphores. Useful for limiting
    concurrent jobs per customer, per resource type, etc.

    Parameters
    ----------
    max_concurrent:
        Maximum simultaneous holders per key.
    default_timeout:
        Default acquire timeout; None means block indefinitely.
    """

    def __init__(
        self,
        max_concurrent: int = 1,
        default_timeout: Optional[float] = None,
    ) -> None:
        if max_concurrent < 1:
            raise ValueError("max_concurrent must be >= 1")
        self._max = max_concurrent
        self._timeout = default_timeout
        self._semaphores: dict[str, NamedSemaphore] = {}
        self._lock = threading.Lock()

    def _get_sem(self, key: str) -> NamedSemaphore:
        with self._lock:
            if key not in self._semaphores:
                self._semaphores[key] = NamedSemaphore(key, self._max)
            return self._semaphores[key]

    @contextlib.contextmanager
    def acquire(self, key: str, timeout: Optional[float] = None):
        """Context manager — blocks until a slot is free (or timeout)."""
        sem = self._get_sem(key)
        t = timeout if timeout is not None else self._timeout
        with sem(timeout=t):
            yield

    def try_acquire(self, key: str) -> bool:
        """Non-blocking attempt. Returns True if slot acquired."""
        sem = self._get_sem(key)
        return sem.acquire(timeout=0)

    def release(self, key: str) -> None:
        sem = self._get_sem(key)
        sem.release()

    def stats(self) -> dict[str, dict]:
        with self._lock:
            sems = dict(self._semaphores)
        return {
            key: {"in_use": sem.in_use, "available": sem.available, "max": self._max}
            for key, sem in sems.items()
        }

    def __repr__(self) -> str:
        return f"ConcurrencyLimiter(max={self._max}, keys={len(self._semaphores)})"


class ThrottleGroup:
    """
    Namespace of ConcurrencyLimiters, each with its own max_concurrent.

    Example::

        group = ThrottleGroup()
        group.add("db_writes",   max_concurrent=5)
        group.add("api_calls",   max_concurrent=10)
        group.add("email_sends", max_concurrent=2)

        with group.acquire("db_writes", "tenant_42"):
            write_to_db(...)
    """

    def __init__(self) -> None:
        self._limiters: dict[str, ConcurrencyLimiter] = {}

    def add(self, name: str, max_concurrent: int, default_timeout: Optional[float] = None) -> None:
        self._limiters[name] = ConcurrencyLimiter(max_concurrent, default_timeout)

    def remove(self, name: str) -> None:
        self._limiters.pop(name, None)

    @contextlib.contextmanager
    def acquire(self, limiter_name: str, key: str, timeout: Optional[float] = None):
        limiter = self._limiters.get(limiter_name)
        if limiter is None:
            yield   # unknown limiter — pass through
            return
        with limiter.acquire(key, timeout=timeout):
            yield

    def stats(self) -> dict[str, dict]:
        return {name: lim.stats() for name, lim in self._limiters.items()}

    def __repr__(self) -> str:
        return f"ThrottleGroup(limiters={list(self._limiters)})"


# Singleton
default_throttle = ThrottleGroup()
