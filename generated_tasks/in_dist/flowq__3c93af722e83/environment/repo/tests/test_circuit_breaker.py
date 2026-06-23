"""Tests for flowq.circuit_breaker."""

import time
import pytest
from flowq.circuit_breaker import (
    CircuitBreaker, CircuitState, CircuitBreakerOpen,
    CircuitBreakerRegistry,
)


def make_cb(**kwargs):
    defaults = {"failure_threshold": 3, "recovery_timeout": 0.1}
    defaults.update(kwargs)
    return CircuitBreaker("test", **defaults)


def test_initial_state_is_closed():
    cb = make_cb()
    assert cb.state == CircuitState.CLOSED


def test_successful_call_passes_through():
    cb = make_cb()
    result = cb.call(lambda: 42)
    assert result == 42


def test_failure_increments_count():
    cb = make_cb()
    for _ in range(2):
        with pytest.raises(ValueError):
            cb.call(lambda: (_ for _ in ()).throw(ValueError("bad")))
    assert cb.failure_count == 2
    assert cb.state == CircuitState.CLOSED


def test_trips_after_threshold():
    cb = make_cb(failure_threshold=3)
    for _ in range(3):
        with pytest.raises(Exception):
            cb.call(lambda: (_ for _ in ()).throw(RuntimeError("x")))
    assert cb.state == CircuitState.OPEN


def test_open_circuit_raises_immediately():
    cb = make_cb(failure_threshold=2)
    for _ in range(2):
        with pytest.raises(Exception):
            cb.call(lambda: (_ for _ in ()).throw(RuntimeError("x")))
    with pytest.raises(CircuitBreakerOpen):
        cb.call(lambda: None)


def test_half_open_after_recovery_timeout():
    cb = make_cb(failure_threshold=2, recovery_timeout=0.05)
    for _ in range(2):
        with pytest.raises(Exception):
            cb.call(lambda: (_ for _ in ()).throw(RuntimeError("x")))
    time.sleep(0.1)
    assert cb.state == CircuitState.HALF_OPEN


def test_half_open_success_closes_circuit():
    cb = make_cb(failure_threshold=2, recovery_timeout=0.05)
    for _ in range(2):
        with pytest.raises(Exception):
            cb.call(lambda: (_ for _ in ()).throw(RuntimeError("x")))
    time.sleep(0.1)
    cb.call(lambda: None)   # probe succeeds
    assert cb.state == CircuitState.CLOSED


def test_reset_closes_circuit():
    cb = make_cb(failure_threshold=2)
    for _ in range(2):
        with pytest.raises(Exception):
            cb.call(lambda: (_ for _ in ()).throw(RuntimeError("x")))
    cb.reset()
    assert cb.state == CircuitState.CLOSED
    assert cb.failure_count == 0


def test_protect_decorator():
    cb = make_cb(failure_threshold=5)
    calls = []

    @cb.protect
    def my_func(x):
        calls.append(x)
        return x * 2

    assert my_func(3) == 6
    assert calls == [3]


def test_snapshot_keys():
    cb = make_cb()
    snap = cb.snapshot()
    assert "state" in snap
    assert "failure_count" in snap
    assert "failure_threshold" in snap


def test_registry_get_or_create():
    reg = CircuitBreakerRegistry()
    cb1 = reg.get_or_create("svc", failure_threshold=3, recovery_timeout=30)
    cb2 = reg.get_or_create("svc")
    assert cb1 is cb2


def test_registry_all_snapshots():
    reg = CircuitBreakerRegistry()
    reg.get_or_create("a")
    reg.get_or_create("b")
    snaps = reg.all_snapshots()
    assert len(snaps) == 2
