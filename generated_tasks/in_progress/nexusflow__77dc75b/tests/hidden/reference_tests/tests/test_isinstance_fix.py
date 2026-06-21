"""Tests that verify isinstance is used for exception hierarchy matching."""
import pytest
from nexusflow.utils.retry import CircuitBreaker, CircuitBreakerState
from nexusflow.tasks.worker import RetryPolicy


class BaseError(Exception):
    pass


class SubError(BaseError):
    pass


def test_circuit_breaker_recognizes_exception_subclasses():
    cb = CircuitBreaker(failure_threshold=3, monitored_exceptions={BaseError})
    for _ in range(3):
        cb.record_failure(SubError("sub"))
    assert cb.state == CircuitBreakerState.OPEN, "subclass should trip circuit breaker"


def test_retry_policy_recognizes_subclass_in_retry_on():
    policy = RetryPolicy(max_retries=2, retry_on={BaseError})
    assert policy.should_retry(SubError("sub"), attempt=0), "subclass should match retry_on"


def test_retry_policy_recognizes_subclass_in_no_retry_on():
    policy = RetryPolicy(max_retries=2, no_retry_on={BaseError})
    assert not policy.should_retry(SubError("sub"), attempt=0), "subclass should match no_retry_on"
