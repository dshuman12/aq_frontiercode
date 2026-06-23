"""
Pluggable retry strategies for FlowQ workers.

Each strategy is a callable that, given the attempt number (1-based),
returns the number of seconds to wait before the next attempt.
Pass a strategy instance to Worker or WorkerPool via retry_strategy=.
"""

from __future__ import annotations

import random
import time
from abc import ABC, abstractmethod
from typing import Optional


class RetryStrategy(ABC):
    """Base class for all retry strategies."""

    @abstractmethod
    def wait_time(self, attempt: int) -> float:
        """Return seconds to wait before *attempt* (1-based)."""

    def sleep(self, attempt: int) -> None:
        """Block for the calculated wait time."""
        t = self.wait_time(attempt)
        if t > 0:
            time.sleep(t)

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}()"


class ImmediateRetry(RetryStrategy):
    """No wait between retries."""

    def wait_time(self, attempt: int) -> float:
        return 0.0


class ConstantDelay(RetryStrategy):
    """Wait a fixed number of seconds between every retry."""

    def __init__(self, delay: float = 1.0) -> None:
        if delay < 0:
            raise ValueError("delay must be >= 0")
        self._delay = delay

    def wait_time(self, attempt: int) -> float:
        return self._delay

    def __repr__(self) -> str:
        return f"ConstantDelay(delay={self._delay})"


class LinearBackoff(RetryStrategy):
    """Wait grows linearly: delay * attempt."""

    def __init__(self, delay: float = 1.0, max_delay: float = 60.0) -> None:
        if delay < 0:
            raise ValueError("delay must be >= 0")
        self._delay = delay
        self._max = max_delay

    def wait_time(self, attempt: int) -> float:
        return min(self._delay * attempt, self._max)

    def __repr__(self) -> str:
        return f"LinearBackoff(delay={self._delay}, max_delay={self._max})"


class ExponentialBackoff(RetryStrategy):
    """Classic exponential back-off with optional jitter."""

    def __init__(
        self,
        base: float = 2.0,
        factor: float = 1.0,
        max_delay: float = 300.0,
        jitter: bool = True,
    ) -> None:
        self._base = base
        self._factor = factor
        self._max = max_delay
        self._jitter = jitter

    def wait_time(self, attempt: int) -> float:
        raw = self._factor * (self._base ** (attempt - 1))
        capped = min(raw, self._max)
        if self._jitter:
            capped *= random.uniform(0.5, 1.0)
        return capped

    def __repr__(self) -> str:
        return (
            f"ExponentialBackoff(base={self._base}, factor={self._factor}, "
            f"max_delay={self._max}, jitter={self._jitter})"
        )


class FibonacciBackoff(RetryStrategy):
    """Wait time follows the Fibonacci sequence (seconds)."""

    def __init__(self, unit: float = 1.0, max_delay: float = 120.0) -> None:
        self._unit = unit
        self._max = max_delay
        self._cache: dict[int, int] = {1: 1, 2: 1}

    def _fib(self, n: int) -> int:
        if n not in self._cache:
            self._cache[n] = self._fib(n - 1) + self._fib(n - 2)
        return self._cache[n]

    def wait_time(self, attempt: int) -> float:
        return min(self._fib(max(attempt, 1)) * self._unit, self._max)

    def __repr__(self) -> str:
        return f"FibonacciBackoff(unit={self._unit}, max_delay={self._max})"


class JitteredBackoff(RetryStrategy):
    """Full jitter: uniform random in [0, min(cap, base * 2^attempt)]."""

    def __init__(self, cap: float = 60.0, base: float = 0.5) -> None:
        self._cap = cap
        self._base = base

    def wait_time(self, attempt: int) -> float:
        ceiling = min(self._cap, self._base * (2 ** attempt))
        return random.uniform(0, ceiling)

    def __repr__(self) -> str:
        return f"JitteredBackoff(cap={self._cap}, base={self._base})"


class CompositeRetry(RetryStrategy):
    """
    Chain multiple strategies: use the first strategy for the first N attempts,
    the second for the next M, etc.

    Example::

        strategy = CompositeRetry([
            (3, ImmediateRetry()),          # first 3 retries: no wait
            (5, ConstantDelay(1.0)),        # next 5: 1 s
            (None, ExponentialBackoff()),   # rest: exponential
        ])
    """

    def __init__(self, stages: list[tuple[Optional[int], RetryStrategy]]) -> None:
        self._stages = stages

    def wait_time(self, attempt: int) -> float:
        remaining = attempt
        for count, strategy in self._stages:
            if count is None or remaining <= count:
                local_attempt = attempt - sum(
                    c for c, _ in self._stages[: self._stages.index((count, strategy))]
                    if c is not None
                )
                return strategy.wait_time(max(local_attempt, 1))
            remaining -= count
        return self._stages[-1][1].wait_time(attempt)


# Convenience factory
def make_strategy(name: str, **kwargs) -> RetryStrategy:
    """
    Build a strategy by name.

    Names: ``immediate``, ``constant``, ``linear``, ``exponential``,
    ``fibonacci``, ``jittered``.
    """
    mapping = {
        "immediate": ImmediateRetry,
        "constant": ConstantDelay,
        "linear": LinearBackoff,
        "exponential": ExponentialBackoff,
        "fibonacci": FibonacciBackoff,
        "jittered": JitteredBackoff,
    }
    cls = mapping.get(name.lower())
    if cls is None:
        raise ValueError(f"Unknown strategy {name!r}. Choose from: {list(mapping)}")
    return cls(**kwargs)
