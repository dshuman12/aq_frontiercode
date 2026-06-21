"""
nexusflow.utils.concurrency
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Thread and async helpers, locks, semaphores, and concurrency
primitives for managing parallel operations.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Callable, Deque, Dict, Generator, List, Optional, TypeVar

T = TypeVar("T")


class ReadWriteLock:
    """A read-write lock allowing multiple concurrent readers OR one writer."""

    def __init__(self) -> None:
        self._readers = 0
        self._reader_lock = threading.Lock()
        self._writer_lock = threading.Lock()
        self._read_ready = threading.Condition(self._reader_lock)

    @contextmanager
    def read_lock(self) -> Generator[None, None, None]:
        """Acquire read access."""
        with self._read_ready:
            self._readers += 1
        try:
            yield
        finally:
            with self._read_ready:
                self._readers -= 1
                if self._readers == 0:
                    self._read_ready.notify_all()

    @contextmanager
    def write_lock(self) -> Generator[None, None, None]:
        """Acquire exclusive write access."""
        self._writer_lock.acquire()
        try:
            with self._read_ready:
                while self._readers > 0:
                    self._read_ready.wait()
            yield
        finally:
            self._writer_lock.release()


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(
        self,
        rate: float,
        burst: int = 1,
    ) -> None:
        self._rate = rate  # Tokens per second
        self._burst = burst
        self._tokens = float(burst)
        self._last_time = time.time()
        self._lock = threading.Lock()

    def acquire(self, tokens: float = 1.0) -> bool:
        """Try to acquire tokens. Returns True if successful."""
        with self._lock:
            now = time.time()
            elapsed = now - self._last_time
            self._tokens = min(
                self._burst,
                self._tokens + elapsed * self._rate,
            )
            self._last_time = now

            if self._tokens >= tokens:
                self._tokens -= tokens
                return True
            return False

    def wait(self, tokens: float = 1.0) -> None:
        """Wait until tokens are available."""
        while not self.acquire(tokens):
            time.sleep(1.0 / self._rate)


class Semaphore:
    """Counting semaphore with timeout and statistics."""

    def __init__(self, max_permits: int = 1) -> None:
        self._max_permits = max_permits
        self._available = max_permits
        self._lock = threading.Lock()
        self._condition = threading.Condition(self._lock)
        self._waiters = 0
        self._acquire_count = 0
        self._release_count = 0

    def acquire(self, timeout: Optional[float] = None) -> bool:
        """Acquire a permit."""
        with self._condition:
            self._waiters += 1
            try:
                while self._available <= 0:
                    if not self._condition.wait(timeout):
                        return False
                self._available -= 1
                self._acquire_count += 1
                return True
            finally:
                self._waiters -= 1

    def release(self) -> None:
        """Release a permit."""
        with self._condition:
            if self._available >= self._max_permits:
                raise ValueError("Too many releases")
            self._available += 1
            self._release_count += 1
            self._condition.notify()

    @contextmanager
    def permit(self, timeout: Optional[float] = None) -> Generator[bool, None, None]:
        """Context manager for acquiring a permit."""
        acquired = self.acquire(timeout)
        try:
            yield acquired
        finally:
            if acquired:
                self.release()

    @property
    def available(self) -> int:
        return self._available

    def get_stats(self) -> Dict[str, Any]:
        return {
            "max_permits": self._max_permits,
            "available": self._available,
            "waiters": self._waiters,
            "acquires": self._acquire_count,
            "releases": self._release_count,
        }


class WorkerPool:
    """Simple thread pool for running tasks concurrently."""

    def __init__(self, size: int = 4) -> None:
        self._size = size
        self._threads: List[threading.Thread] = []
        self._task_queue: Deque[Callable] = deque()
        self._lock = threading.Lock()
        self._condition = threading.Condition(self._lock)
        self._running = False
        self._completed = 0
        self._errors = 0

    def start(self) -> None:
        """Start the worker pool."""
        self._running = True
        for i in range(self._size):
            t = threading.Thread(target=self._worker, daemon=True, name=f"worker-{i}")
            t.start()
            self._threads.append(t)

    def stop(self) -> None:
        """Stop the worker pool."""
        self._running = False
        with self._condition:
            self._condition.notify_all()
        for t in self._threads:
            t.join(timeout=5)
        self._threads.clear()

    def submit(self, task: Callable) -> None:
        """Submit a task for execution."""
        with self._condition:
            self._task_queue.append(task)
            self._condition.notify()

    def _worker(self) -> None:
        """Worker thread main loop."""
        while self._running:
            task: Optional[Callable] = None
            with self._condition:
                while not self._task_queue and self._running:
                    self._condition.wait(timeout=1.0)
                if self._task_queue:
                    task = self._task_queue.popleft()

            if task:
                try:
                    task()
                    with self._lock:
                        self._completed += 1
                except Exception:
                    with self._lock:
                        self._errors += 1

    def get_stats(self) -> Dict[str, Any]:
        return {
            "size": self._size,
            "running": self._running,
            "pending": len(self._task_queue),
            "completed": self._completed,
            "errors": self._errors,
        }


class Barrier:
    """Reusable barrier for coordinating threads."""

    def __init__(self, parties: int) -> None:
        self._parties = parties
        self._count = 0
        self._generation = 0
        self._lock = threading.Lock()
        self._condition = threading.Condition(self._lock)

    def wait(self, timeout: Optional[float] = None) -> int:
        """Wait at the barrier. Returns the arrival index."""
        with self._condition:
            gen = self._generation
            idx = self._count
            self._count += 1

            if self._count >= self._parties:
                # Last party triggers release
                self._count = 0
                self._generation += 1
                self._condition.notify_all()
                return idx

            # Wait for all parties
            while gen == self._generation:
                if not self._condition.wait(timeout):
                    raise TimeoutError("Barrier wait timed out")

            return idx

    @property
    def parties(self) -> int:
        return self._parties

    @property
    def n_waiting(self) -> int:
        return self._count
