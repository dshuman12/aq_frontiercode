"""Tests for flowq.throttle."""

import threading
import time
import pytest
from flowq.throttle import (
    ConcurrencyLimiter, NamedSemaphore, ThrottleGroup, LimitExceeded,
)


def test_named_semaphore_acquire_release():
    sem = NamedSemaphore("key", 2)
    assert sem.acquire(timeout=0)
    assert sem.in_use == 1
    assert sem.available == 1
    sem.release()
    assert sem.in_use == 0


def test_named_semaphore_context_manager():
    sem = NamedSemaphore("key", 1)
    with sem(timeout=0):
        assert sem.in_use == 1
    assert sem.in_use == 0


def test_named_semaphore_exhausted_returns_false():
    sem = NamedSemaphore("key", 1)
    sem.acquire(timeout=0)
    result = sem.acquire(timeout=0)
    assert result is False


def test_concurrency_limiter_allows_up_to_max():
    lim = ConcurrencyLimiter(max_concurrent=2)
    assert lim.try_acquire("k") is True
    assert lim.try_acquire("k") is True
    assert lim.try_acquire("k") is False
    lim.release("k")
    lim.release("k")


def test_concurrency_limiter_different_keys_independent():
    lim = ConcurrencyLimiter(max_concurrent=1)
    assert lim.try_acquire("a") is True
    assert lim.try_acquire("b") is True  # different key, own semaphore


def test_concurrency_limiter_context_manager():
    lim = ConcurrencyLimiter(max_concurrent=1)
    with lim.acquire("x"):
        assert lim.stats()["x"]["in_use"] == 1
    assert lim.stats()["x"]["in_use"] == 0


def test_concurrency_limiter_timeout_raises():
    lim = ConcurrencyLimiter(max_concurrent=1)
    lim.try_acquire("slot")
    with pytest.raises(LimitExceeded):
        with lim.acquire("slot", timeout=0.01):
            pass
    lim.release("slot")


def test_concurrency_limiter_invalid_max():
    with pytest.raises(ValueError):
        ConcurrencyLimiter(max_concurrent=0)


def test_throttle_group_passthrough_for_unknown():
    group = ThrottleGroup()
    # unknown limiter — should not raise
    with group.acquire("unknown", "key"):
        pass


def test_throttle_group_respects_limit():
    group = ThrottleGroup()
    group.add("db", max_concurrent=1)
    group._limiters["db"].try_acquire("t1")
    with pytest.raises(LimitExceeded):
        with group.acquire("db", "t1", timeout=0.01):
            pass
    group._limiters["db"].release("t1")


def test_throttle_group_stats():
    group = ThrottleGroup()
    group.add("api", max_concurrent=3)
    group._limiters["api"].try_acquire("tenant1")
    stats = group.stats()
    assert "api" in stats
    assert stats["api"]["tenant1"]["in_use"] == 1
    group._limiters["api"].release("tenant1")


def test_concurrent_access_is_safe():
    lim = ConcurrencyLimiter(max_concurrent=5)
    results = []
    lock = threading.Lock()

    def worker():
        with lim.acquire("shared"):
            with lock:
                results.append(1)
            time.sleep(0.01)

    threads = [threading.Thread(target=worker) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sum(results) == 10
