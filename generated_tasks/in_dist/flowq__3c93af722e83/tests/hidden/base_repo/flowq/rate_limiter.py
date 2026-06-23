"""Rate limiting for FlowQ job execution.

Provides two algorithms:
- ``TokenBucketLimiter``: classic token bucket (handles bursts gracefully)
- ``SlidingWindowLimiter``: sliding window counter (strict, no burst)

Both are thread-safe and can be used as stand-alone limiters or
plugged into the Worker via middleware.
"""

from __future__ import annotations

import collections
import threading
import time
from typing import Deque, Dict, Optional


class TokenBucketLimiter:
    """Token bucket rate limiter.

    Allows up to *capacity* tokens; tokens refill at *rate* per second.
    A call to ``acquire()`` blocks until a token is available.
    """

    def __init__(self, capacity: int, rate: float):
        """
        Args:
            capacity: Maximum burst size (token bucket depth).
            rate: Tokens added per second.
        """
        if capacity <= 0:
            raise ValueError("capacity must be > 0")
        if rate <= 0:
            raise ValueError("rate must be > 0")
        self._capacity  = float(capacity)
        self._rate      = float(rate)
        self._tokens    = float(capacity)
        self._last_time = time.monotonic()
        self._lock      = threading.Lock()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def acquire(self, tokens: float = 1.0, timeout: Optional[float] = None) -> bool:
        """Acquire *tokens* from the bucket.

        Args:
            tokens: Number of tokens to consume (default 1).
            timeout: Maximum seconds to wait; None = wait forever.

        Returns:
            True if acquired, False if timed out.
        """
        deadline = None if timeout is None else time.monotonic() + timeout
        while True:
            with self._lock:
                self._refill()
                if self._tokens >= tokens:
                    self._tokens -= tokens
                    return True
            # Not enough tokens — calculate wait time
            wait = (tokens - self._tokens) / self._rate
            if deadline is not None:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return False
                wait = min(wait, remaining)
            time.sleep(min(wait, 0.05))

    def try_acquire(self, tokens: float = 1.0) -> bool:
        """Non-blocking acquire. Returns False immediately if insufficient."""
        with self._lock:
            self._refill()
            if self._tokens >= tokens:
                self._tokens -= tokens
                return True
        return False

    @property
    def available(self) -> float:
        with self._lock:
            self._refill()
            return self._tokens

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self._last_time
        self._tokens = min(self._capacity, self._tokens + elapsed * self._rate)
        self._last_time = now

    def __repr__(self) -> str:
        return f"TokenBucketLimiter(capacity={self._capacity}, rate={self._rate}/s)"


class SlidingWindowLimiter:
    """Sliding window rate limiter.

    Allows at most *max_calls* calls within any rolling *period* seconds.
    Stricter than a token bucket — no burst accumulation.
    """

    def __init__(self, max_calls: int, period: float):
        if max_calls <= 0:
            raise ValueError("max_calls must be > 0")
        if period <= 0:
            raise ValueError("period must be > 0")
        self._max_calls = max_calls
        self._period    = period
        self._calls: Deque[float] = collections.deque()
        self._lock = threading.Lock()

    def acquire(self, timeout: Optional[float] = None) -> bool:
        """Block until a call slot is available within the window."""
        deadline = None if timeout is None else time.monotonic() + timeout
        while True:
            with self._lock:
                now = time.monotonic()
                # Evict calls outside the window
                cutoff = now - self._period
                while self._calls and self._calls[0] <= cutoff:
                    self._calls.popleft()
                if len(self._calls) < self._max_calls:
                    self._calls.append(now)
                    return True
                # Calculate when the oldest call expires
                wait = self._period - (now - self._calls[0])
            if deadline is not None and time.monotonic() + wait > deadline:
                return False
            time.sleep(min(wait, 0.05))

    def try_acquire(self) -> bool:
        with self._lock:
            now = time.monotonic()
            cutoff = now - self._period
            while self._calls and self._calls[0] <= cutoff:
                self._calls.popleft()
            if len(self._calls) < self._max_calls:
                self._calls.append(now)
                return True
        return False

    @property
    def current_count(self) -> int:
        with self._lock:
            now = time.monotonic()
            cutoff = now - self._period
            while self._calls and self._calls[0] <= cutoff:
                self._calls.popleft()
            return len(self._calls)

    def __repr__(self) -> str:
        return f"SlidingWindowLimiter(max_calls={self._max_calls}, period={self._period}s)"


# Per-job-name rate limiters registry
class RateLimiterRegistry:
    """Manages per-job-type rate limiters."""

    def __init__(self):
        self._limiters: Dict[str, TokenBucketLimiter] = {}
        self._lock = threading.Lock()

    def register(self, job_name: str, capacity: int, rate: float) -> TokenBucketLimiter:
        with self._lock:
            limiter = TokenBucketLimiter(capacity, rate)
            self._limiters[job_name] = limiter
            return limiter

    def get(self, job_name: str) -> Optional[TokenBucketLimiter]:
        with self._lock:
            return self._limiters.get(job_name)

    def acquire_for(self, job_name: str) -> bool:
        limiter = self.get(job_name)
        if limiter is None:
            return True   # no limit registered
        return limiter.try_acquire()

    def __repr__(self) -> str:
        return f"RateLimiterRegistry(registered={list(self._limiters.keys())})"


rate_limiters = RateLimiterRegistry()
