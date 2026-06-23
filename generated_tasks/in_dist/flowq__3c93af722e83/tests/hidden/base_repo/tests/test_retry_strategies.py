"""Tests for flowq.retry_strategies."""

import pytest
from flowq.retry_strategies import (
    ImmediateRetry, ConstantDelay, LinearBackoff,
    ExponentialBackoff, FibonacciBackoff, JitteredBackoff,
    CompositeRetry, make_strategy,
)


def test_immediate_always_zero():
    s = ImmediateRetry()
    assert s.wait_time(1) == 0.0
    assert s.wait_time(10) == 0.0


def test_constant_delay_fixed():
    s = ConstantDelay(delay=2.5)
    assert s.wait_time(1) == 2.5
    assert s.wait_time(5) == 2.5


def test_constant_delay_negative_raises():
    with pytest.raises(ValueError):
        ConstantDelay(delay=-1)


def test_linear_backoff_grows():
    s = LinearBackoff(delay=1.0, max_delay=10.0)
    assert s.wait_time(1) == 1.0
    assert s.wait_time(3) == 3.0
    assert s.wait_time(100) == 10.0   # capped


def test_exponential_backoff_no_jitter():
    s = ExponentialBackoff(base=2.0, factor=1.0, max_delay=100.0, jitter=False)
    assert s.wait_time(1) == 1.0
    assert s.wait_time(2) == 2.0
    assert s.wait_time(3) == 4.0


def test_exponential_backoff_capped():
    s = ExponentialBackoff(base=2.0, factor=1.0, max_delay=5.0, jitter=False)
    assert s.wait_time(10) == 5.0


def test_exponential_backoff_with_jitter_in_range():
    s = ExponentialBackoff(base=2.0, factor=1.0, max_delay=100.0, jitter=True)
    for attempt in range(1, 8):
        t = s.wait_time(attempt)
        expected_max = min(2.0 ** (attempt - 1), 100.0)
        assert 0 <= t <= expected_max + 1e-9


def test_fibonacci_backoff_sequence():
    s = FibonacciBackoff(unit=1.0, max_delay=1000.0)
    # fib: 1,1,2,3,5,8,13,...
    expected = [1, 1, 2, 3, 5, 8, 13]
    for i, exp in enumerate(expected, start=1):
        assert s.wait_time(i) == exp


def test_fibonacci_backoff_capped():
    s = FibonacciBackoff(unit=1.0, max_delay=3.0)
    assert s.wait_time(5) == 3.0    # fib(5)=5 > 3


def test_jittered_backoff_within_bounds():
    s = JitteredBackoff(cap=10.0, base=0.5)
    for attempt in range(1, 10):
        t = s.wait_time(attempt)
        assert 0 <= t <= 10.0


def test_make_strategy_by_name():
    for name in ("immediate", "constant", "linear", "exponential", "fibonacci", "jittered"):
        s = make_strategy(name)
        assert s is not None


def test_make_strategy_unknown_raises():
    with pytest.raises(ValueError):
        make_strategy("unknown_strategy")


def test_repr_contains_class_name():
    for cls in (ImmediateRetry, ConstantDelay, LinearBackoff):
        assert cls.__name__ in repr(cls())
