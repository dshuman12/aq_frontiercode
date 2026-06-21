"""Tests for nexusflow.utils.retry and CircuitBreaker."""

import time
import pytest

from nexusflow.utils.retry import (
    BackoffStrategy,
    CircuitBreaker,
    CircuitBreakerState,
    RetryConfig,
    RetryError,
    retry,
)


class TestRetryConfig:
    """Tests for retry configuration and delay calculation."""

    def test_exponential_delay(self):
        config = RetryConfig(base_delay=1.0, strategy=BackoffStrategy.EXPONENTIAL, jitter=False)
        assert config.get_delay(0) == 1.0
        assert config.get_delay(1) == 2.0
        assert config.get_delay(2) == 4.0

    def test_linear_delay(self):
        config = RetryConfig(base_delay=2.0, strategy=BackoffStrategy.LINEAR, jitter=False)
        assert config.get_delay(1) == 2.0
        assert config.get_delay(2) == 4.0

    def test_constant_delay(self):
        config = RetryConfig(base_delay=5.0, strategy=BackoffStrategy.CONSTANT, jitter=False)
        assert config.get_delay(0) == 5.0
        assert config.get_delay(3) == 5.0

    def test_fibonacci_delay(self):
        config = RetryConfig(base_delay=1.0, strategy=BackoffStrategy.FIBONACCI, jitter=False)
        assert config.get_delay(1) == 1.0  # fib(1) = 1
        assert config.get_delay(5) == 5.0  # fib(5) = 5

    def test_max_delay_cap(self):
        config = RetryConfig(base_delay=1.0, max_delay=10.0, strategy=BackoffStrategy.EXPONENTIAL, jitter=False)
        assert config.get_delay(20) == 10.0

    def test_jitter_varies_delay(self):
        config = RetryConfig(base_delay=10.0, strategy=BackoffStrategy.CONSTANT, jitter=True, jitter_range=0.5)
        delays = {config.get_delay(0) for _ in range(20)}
        # With jitter, delays should not all be the same
        assert len(delays) > 1

    def test_should_retry_default_all(self):
        config = RetryConfig()
        assert config.should_retry(ValueError("x")) is True

    def test_should_retry_no_retry_on(self):
        config = RetryConfig(no_retry_on={KeyboardInterrupt})
        assert config.should_retry(KeyboardInterrupt()) is False

    def test_should_retry_only_specified(self):
        config = RetryConfig(retry_on={ConnectionError})
        assert config.should_retry(ConnectionError()) is True
        assert config.should_retry(ValueError()) is False


class TestRetryDecorator:
    """Tests for the @retry decorator."""

    def test_successful_on_first_try(self):
        @retry(max_attempts=3, base_delay=0.01)
        def ok():
            return 42

        assert ok() == 42

    def test_retries_on_failure(self):
        call_count = [0]

        @retry(max_attempts=3, base_delay=0.01)
        def flaky():
            call_count[0] += 1
            if call_count[0] < 3:
                raise ValueError("not yet")
            return "ok"

        assert flaky() == "ok"
        assert call_count[0] == 3

    def test_raises_retry_error_after_exhaustion(self):
        @retry(max_attempts=2, base_delay=0.01)
        def always_fail():
            raise ValueError("permanent")

        with pytest.raises(RetryError, match="Failed after"):
            always_fail()

    def test_no_retry_on_excluded_exception(self):
        @retry(max_attempts=5, base_delay=0.01, retry_on={ConnectionError})
        def wrong_error():
            raise ValueError("not retryable")

        with pytest.raises(ValueError):
            wrong_error()

    def test_on_retry_callback(self):
        retries_logged = []

        @retry(max_attempts=3, base_delay=0.01, on_retry=lambda a, e: retries_logged.append(a))
        def flaky():
            if len(retries_logged) < 2:
                raise ValueError("retry me")
            return "done"

        flaky()
        assert len(retries_logged) == 2


class TestCircuitBreaker:
    """Tests for the CircuitBreaker pattern."""

    def test_initial_state_closed(self):
        cb = CircuitBreaker(failure_threshold=3)
        assert cb.state == CircuitBreakerState.CLOSED

    def test_opens_after_threshold(self):
        cb = CircuitBreaker(failure_threshold=3, monitored_exceptions={Exception})
        for _ in range(3):
            cb.record_failure(Exception("fail"))
        assert cb.state == CircuitBreakerState.OPEN

    def test_rejects_when_open(self):
        cb = CircuitBreaker(failure_threshold=1, monitored_exceptions={Exception})
        cb.record_failure(Exception("fail"))
        assert cb.state == CircuitBreakerState.OPEN
        assert cb.can_execute() is False

    def test_half_open_after_timeout(self):
        cb = CircuitBreaker(
            failure_threshold=1,
            reset_timeout=0.1,
            monitored_exceptions={Exception},
        )
        cb.record_failure(Exception("fail"))
        assert cb.state == CircuitBreakerState.OPEN
        time.sleep(0.2)
        assert cb.state == CircuitBreakerState.HALF_OPEN

    def test_closes_after_successful_probe(self):
        cb = CircuitBreaker(
            failure_threshold=1,
            reset_timeout=0.1,
            half_open_max_calls=1,
            monitored_exceptions={Exception},
        )
        cb.record_failure(Exception("fail"))
        time.sleep(0.2)
        assert cb.state == CircuitBreakerState.HALF_OPEN
        cb.record_success()
        assert cb.state == CircuitBreakerState.CLOSED

    def test_reopens_on_half_open_failure(self):
        cb = CircuitBreaker(
            failure_threshold=1,
            reset_timeout=0.1,
            monitored_exceptions={Exception},
        )
        cb.record_failure(Exception("fail"))
        time.sleep(0.2)
        assert cb.state == CircuitBreakerState.HALF_OPEN
        cb.record_failure(Exception("fail again"))
        assert cb.state == CircuitBreakerState.OPEN

    def test_state_listener(self):
        transitions = []
        cb = CircuitBreaker(failure_threshold=1, monitored_exceptions={Exception})
        cb._state_listeners.append(lambda s: transitions.append(s))
        cb.record_failure(Exception("fail"))
        assert CircuitBreakerState.OPEN in transitions

    def test_unmonitored_exception_ignored(self):
        cb = CircuitBreaker(failure_threshold=1, monitored_exceptions={ConnectionError})
        cb.record_failure(ValueError("not monitored"))
        assert cb.state == CircuitBreakerState.CLOSED
