"""Tests for flowq/rate_limiter.py."""

import time
import pytest
from flowq.rate_limiter import TokenBucketLimiter, SlidingWindowLimiter, RateLimiterRegistry


# ── TokenBucketLimiter ─────────────────────────────────────────────────────

def test_token_bucket_try_acquire_within_capacity():
    limiter = TokenBucketLimiter(capacity=5, rate=1.0)
    assert all(limiter.try_acquire() for _ in range(5))


def test_token_bucket_exhausted_returns_false():
    limiter = TokenBucketLimiter(capacity=2, rate=0.01)
    limiter.try_acquire(); limiter.try_acquire()
    assert not limiter.try_acquire()


def test_token_bucket_invalid_capacity_raises():
    with pytest.raises(ValueError):
        TokenBucketLimiter(capacity=0, rate=1.0)


def test_token_bucket_invalid_rate_raises():
    with pytest.raises(ValueError):
        TokenBucketLimiter(capacity=5, rate=0)


def test_token_bucket_acquire_with_timeout():
    limiter = TokenBucketLimiter(capacity=1, rate=0.1)
    limiter.try_acquire()
    result = limiter.acquire(timeout=0.05)
    assert result is False


# ── SlidingWindowLimiter ───────────────────────────────────────────────────

def test_sliding_window_allows_up_to_max():
    limiter = SlidingWindowLimiter(max_calls=3, period=10.0)
    assert all(limiter.try_acquire() for _ in range(3))


def test_sliding_window_blocks_beyond_max():
    limiter = SlidingWindowLimiter(max_calls=2, period=10.0)
    limiter.try_acquire(); limiter.try_acquire()
    assert not limiter.try_acquire()


def test_sliding_window_current_count():
    limiter = SlidingWindowLimiter(max_calls=5, period=10.0)
    limiter.try_acquire(); limiter.try_acquire()
    assert limiter.current_count == 2


def test_sliding_window_invalid_params():
    with pytest.raises(ValueError):
        SlidingWindowLimiter(max_calls=0, period=1.0)
    with pytest.raises(ValueError):
        SlidingWindowLimiter(max_calls=1, period=0)


# ── RateLimiterRegistry ────────────────────────────────────────────────────

def test_registry_register_and_get():
    reg = RateLimiterRegistry()
    reg.register("my_job", capacity=10, rate=5.0)
    assert reg.get("my_job") is not None


def test_registry_acquire_for_unregistered_returns_true():
    reg = RateLimiterRegistry()
    assert reg.acquire_for("unregistered") is True
