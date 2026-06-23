"""
Circuit-breaker implementation for FlowQ job handlers.

States
------
CLOSED   — normal operation, calls pass through.
OPEN     — too many failures; calls are blocked immediately.
HALF_OPEN — probe state; one call is let through to test recovery.

Usage::

    cb = CircuitBreaker("payments", failure_threshold=5, recovery_timeout=30)

    @cb.protect
    def charge_card(amount):
        ...

    # or inline:
    result = cb.call(charge_card, amount)
"""

from __future__ import annotations

import functools
import threading
import time
from enum import Enum, auto
from typing import Any, Callable, Optional


class CircuitState(Enum):
    CLOSED    = auto()
    OPEN      = auto()
    HALF_OPEN = auto()


class CircuitBreakerOpen(Exception):
    """Raised when a call is attempted while the circuit is OPEN."""


class CircuitBreaker:
    """
    Thread-safe circuit breaker.

    Parameters
    ----------
    name:
        Human-readable identifier (used in repr / logs).
    failure_threshold:
        Number of consecutive failures that trip the breaker.
    recovery_timeout:
        Seconds to wait in OPEN state before trying HALF_OPEN.
    success_threshold:
        Consecutive successes in HALF_OPEN needed to close again.
    expected_exception:
        Exception class (or tuple) that counts as a failure.
        Other exceptions propagate without tripping the breaker.
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        success_threshold: int = 1,
        expected_exception: type | tuple[type, ...] = Exception,
    ) -> None:
        self.name = name
        self._failure_threshold = failure_threshold
        self._recovery_timeout = recovery_timeout
        self._success_threshold = success_threshold
        self._expected = expected_exception

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._opened_at: Optional[float] = None
        self._lock = threading.Lock()

    # ── public API ──────────────────────────────────────────────────────────

    @property
    def state(self) -> CircuitState:
        with self._lock:
            return self._current_state()

    @property
    def failure_count(self) -> int:
        return self._failure_count

    def call(self, func: Callable, *args: Any, **kwargs: Any) -> Any:
        """Execute *func* through the breaker."""
        with self._lock:
            state = self._current_state()
            if state == CircuitState.OPEN:
                raise CircuitBreakerOpen(
                    f"Circuit '{self.name}' is OPEN — calls blocked until "
                    f"{self._opened_at + self._recovery_timeout:.0f}"
                )
            if state == CircuitState.HALF_OPEN:
                # Only one probe at a time
                self._state = CircuitState.HALF_OPEN  # no change, just track

        try:
            result = func(*args, **kwargs)
        except self._expected as exc:
            with self._lock:
                self._on_failure()
            raise
        else:
            with self._lock:
                self._on_success()
            return result

    def protect(self, func: Callable) -> Callable:
        """Decorator — wrap *func* so every call goes through this breaker."""
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return self.call(func, *args, **kwargs)
        return wrapper

    def reset(self) -> None:
        """Manually close the circuit and reset counters."""
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._opened_at = None

    def force_open(self) -> None:
        """Manually open the circuit (e.g. during maintenance)."""
        with self._lock:
            self._trip()

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "name": self.name,
                "state": self._current_state().name,
                "failure_count": self._failure_count,
                "success_count": self._success_count,
                "opened_at": self._opened_at,
                "failure_threshold": self._failure_threshold,
                "recovery_timeout": self._recovery_timeout,
            }

    def __repr__(self) -> str:
        return (
            f"CircuitBreaker(name={self.name!r}, state={self.state.name}, "
            f"failures={self._failure_count}/{self._failure_threshold})"
        )

    # ── internals ───────────────────────────────────────────────────────────

    def _current_state(self) -> CircuitState:
        if self._state == CircuitState.OPEN:
            if time.monotonic() - self._opened_at >= self._recovery_timeout:
                self._state = CircuitState.HALF_OPEN
                self._success_count = 0
        return self._state

    def _on_failure(self) -> None:
        self._failure_count += 1
        if self._state == CircuitState.HALF_OPEN:
            self._trip()
        elif self._failure_count >= self._failure_threshold:
            self._trip()

    def _on_success(self) -> None:
        if self._state == CircuitState.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self._success_threshold:
                self._close()
        else:
            self._failure_count = 0

    def _trip(self) -> None:
        self._state = CircuitState.OPEN
        self._opened_at = time.monotonic()

    def _close(self) -> None:
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._opened_at = None


class CircuitBreakerRegistry:
    """Global registry of named circuit breakers."""

    def __init__(self) -> None:
        self._breakers: dict[str, CircuitBreaker] = {}
        self._lock = threading.Lock()

    def get_or_create(
        self,
        name: str,
        **kwargs: Any,
    ) -> CircuitBreaker:
        with self._lock:
            if name not in self._breakers:
                self._breakers[name] = CircuitBreaker(name, **kwargs)
            return self._breakers[name]

    def get(self, name: str) -> Optional[CircuitBreaker]:
        return self._breakers.get(name)

    def all_snapshots(self) -> list[dict]:
        return [cb.snapshot() for cb in self._breakers.values()]

    def reset_all(self) -> None:
        for cb in self._breakers.values():
            cb.reset()


circuit_breakers = CircuitBreakerRegistry()
