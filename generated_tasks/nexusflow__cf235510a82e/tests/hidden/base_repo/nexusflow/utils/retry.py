"""
nexusflow.utils.retry
~~~~~~~~~~~~~~~~~~~~~

Retry with exponential backoff and circuit breaker pattern.
Provides decorators and context managers for resilient operations.

BUG CANDIDATE #19: The circuit breaker never resets when the
exception is a subclass of the expected type. The failure recording
uses `type(e) is ExcType` instead of `isinstance(e, ExcType)`, so
subclassed exceptions don't count toward the failure threshold,
but they also don't trigger a successful reset.
"""

from __future__ import annotations

import random
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Type, TypeVar

T = TypeVar("T")


class RetryError(Exception):
    """Raised when all retries are exhausted."""

    def __init__(self, message: str, last_exception: Optional[Exception] = None) -> None:
        super().__init__(message)
        self.last_exception = last_exception


class BackoffStrategy(Enum):
    """Backoff strategies for retry delays."""
    CONSTANT = "constant"
    LINEAR = "linear"
    EXPONENTIAL = "exponential"
    FIBONACCI = "fibonacci"


class RetryConfig:
    """Configuration for retry behavior."""

    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        strategy: BackoffStrategy = BackoffStrategy.EXPONENTIAL,
        exponential_base: float = 2.0,
        jitter: bool = True,
        jitter_range: float = 0.5,
        retry_on: Optional[Set[Type[Exception]]] = None,
        no_retry_on: Optional[Set[Type[Exception]]] = None,
    ) -> None:
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.strategy = strategy
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.jitter_range = jitter_range
        self.retry_on = retry_on
        self.no_retry_on = no_retry_on or set()

    def get_delay(self, attempt: int) -> float:
        """Calculate delay for the given attempt number."""
        if self.strategy == BackoffStrategy.CONSTANT:
            delay = self.base_delay
        elif self.strategy == BackoffStrategy.LINEAR:
            delay = self.base_delay * attempt
        elif self.strategy == BackoffStrategy.EXPONENTIAL:
            delay = self.base_delay * (self.exponential_base ** attempt)
        elif self.strategy == BackoffStrategy.FIBONACCI:
            delay = self.base_delay * self._fibonacci(attempt)
        else:
            delay = self.base_delay

        if self.jitter:
            jitter_amount = delay * self.jitter_range
            delay += random.uniform(-jitter_amount, jitter_amount)

        return max(0, min(delay, self.max_delay))

    @staticmethod
    def _fibonacci(n: int) -> int:
        """Calculate the nth Fibonacci number."""
        if n <= 0:
            return 0
        if n == 1:
            return 1
        a, b = 0, 1
        for _ in range(2, n + 1):
            a, b = b, a + b
        return b

    def should_retry(self, exception: Exception) -> bool:
        """Determine if an exception should be retried."""
        for exc_type in self.no_retry_on:
            if isinstance(exception, exc_type):
                return False
        if self.retry_on is not None:
            return any(isinstance(exception, t) for t in self.retry_on)
        return True


def retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    strategy: BackoffStrategy = BackoffStrategy.EXPONENTIAL,
    retry_on: Optional[Set[Type[Exception]]] = None,
    on_retry: Optional[Callable[[int, Exception], None]] = None,
) -> Callable:
    """Decorator for retrying a function on failure."""
    config = RetryConfig(
        max_attempts=max_attempts,
        base_delay=base_delay,
        strategy=strategy,
        retry_on=retry_on,
    )

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exc: Optional[Exception] = None
            for attempt in range(config.max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exc = e
                    if not config.should_retry(e):
                        raise
                    if attempt == config.max_attempts - 1:
                        raise RetryError(
                            f"Failed after {config.max_attempts} attempts",
                            last_exception=e,
                        ) from e
                    if on_retry:
                        on_retry(attempt + 1, e)
                    delay = config.get_delay(attempt)
                    time.sleep(delay)
            raise RetryError("Exhausted retries", last_exception=last_exc)
        return wrapper
    return decorator


class CircuitBreakerState(Enum):
    """States of the circuit breaker."""
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    """
    Circuit breaker pattern implementation.

    BUG CANDIDATE #19: Failure counting uses `type(e) is exc_type`
    instead of `isinstance(e, exc_type)`. If a recorded exception
    is a subclass of a monitored type, it won't be counted as a
    failure for that type, so the breaker never trips. Similarly,
    the half-open probe success check won't count subclass exceptions
    as actual failures, causing the breaker to close prematurely.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        reset_timeout: float = 30.0,
        half_open_max_calls: int = 1,
        monitored_exceptions: Optional[Set[Type[Exception]]] = None,
    ) -> None:
        self._failure_threshold = failure_threshold
        self._reset_timeout = reset_timeout
        self._half_open_max_calls = half_open_max_calls
        self._monitored_exceptions = monitored_exceptions or {Exception}
        self._state = CircuitBreakerState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[float] = None
        self._half_open_calls = 0
        self._lock = threading.Lock()
        self._state_listeners: List[Callable[[CircuitBreakerState], None]] = []

    @property
    def state(self) -> CircuitBreakerState:
        with self._lock:
            if self._state == CircuitBreakerState.OPEN:
                if self._last_failure_time and (
                    time.time() - self._last_failure_time > self._reset_timeout
                ):
                    self._state = CircuitBreakerState.HALF_OPEN
                    self._half_open_calls = 0
            return self._state

    def record_success(self) -> None:
        """Record a successful call."""
        with self._lock:
            if self._state == CircuitBreakerState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self._half_open_max_calls:
                    self._transition(CircuitBreakerState.CLOSED)
                    self._failure_count = 0
                    self._success_count = 0
            elif self._state == CircuitBreakerState.CLOSED:
                self._success_count += 1

    def record_failure(self, exception: Exception) -> None:
        """
        Record a failed call.

        BUG CANDIDATE #19: Uses `type(e) is exc_type` which misses
        subclass exceptions. If ConnectionError is monitored but
        a TimeoutError(ConnectionError) subclass is raised, it
        won't be counted as a failure.
        """
        with self._lock:
            is_monitored = False
            for exc_type in self._monitored_exceptions:
                # BUG: type() check instead of isinstance()
                # Subclass exceptions won't match
                if type(exception) is exc_type:
                    is_monitored = True
                    break

            if not is_monitored:
                return  # Silently ignores subclass exceptions

            self._failure_count += 1
            self._last_failure_time = time.time()

            if self._state == CircuitBreakerState.HALF_OPEN:
                self._transition(CircuitBreakerState.OPEN)
            elif self._failure_count >= self._failure_threshold:
                self._transition(CircuitBreakerState.OPEN)

    def _transition(self, new_state: CircuitBreakerState) -> None:
        """Transition to a new state."""
        old = self._state
        self._state = new_state
        for listener in self._state_listeners:
            try:
                listener(new_state)
            except Exception:
                pass

    def can_execute(self) -> bool:
        """Check if a call is allowed."""
        state = self.state
        if state == CircuitBreakerState.CLOSED:
            return True
        if state == CircuitBreakerState.HALF_OPEN:
            with self._lock:
                if self._half_open_calls < self._half_open_max_calls:
                    self._half_open_calls += 1
                    return True
            return False
        return False

    def execute(self, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        """Execute a function through the circuit breaker."""
        if not self.can_execute():
            raise RuntimeError("Circuit breaker is OPEN")
        try:
            result = func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure(e)
            raise

    def on_state_change(self, listener: Callable[[CircuitBreakerState], None]) -> None:
        self._state_listeners.append(listener)

    def reset(self) -> None:
        """Manually reset the circuit breaker."""
        with self._lock:
            self._state = CircuitBreakerState.CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._last_failure_time = None
            self._half_open_calls = 0

    def get_stats(self) -> Dict[str, Any]:
        return {
            "state": self.state.value,
            "failures": self._failure_count,
            "successes": self._success_count,
            "threshold": self._failure_threshold,
            "reset_timeout": self._reset_timeout,
        }


class RetryWithCircuitBreaker:
    """Combines retry logic with circuit breaker."""

    def __init__(
        self,
        retry_config: RetryConfig,
        circuit_breaker: CircuitBreaker,
    ) -> None:
        self._retry = retry_config
        self._breaker = circuit_breaker

    def execute(self, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        last_exc: Optional[Exception] = None
        for attempt in range(self._retry.max_attempts):
            if not self._breaker.can_execute():
                raise RuntimeError("Circuit breaker is OPEN")
            try:
                result = func(*args, **kwargs)
                self._breaker.record_success()
                return result
            except Exception as e:
                last_exc = e
                self._breaker.record_failure(e)
                if not self._retry.should_retry(e):
                    raise
                if attempt < self._retry.max_attempts - 1:
                    delay = self._retry.get_delay(attempt)
                    time.sleep(delay)

        raise RetryError(
            f"Failed after {self._retry.max_attempts} attempts",
            last_exception=last_exc,
        )
