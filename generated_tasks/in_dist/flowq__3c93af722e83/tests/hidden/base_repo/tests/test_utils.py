"""Tests for flowq/utils.py."""

import pytest
import time
from flowq.utils import (
    retry, exponential_backoff, safe_json_dumps, safe_json_loads,
    payload_fingerprint, chunk, clamp, format_duration,
)


def test_retry_succeeds_on_first_try():
    calls = []
    @retry(max_attempts=3)
    def fn():
        calls.append(1)
        return "ok"
    assert fn() == "ok"
    assert len(calls) == 1


def test_retry_retries_on_failure():
    calls = []
    @retry(max_attempts=3, base_delay=0, jitter=False)
    def fn():
        calls.append(1)
        if len(calls) < 3:
            raise ValueError("not yet")
        return "done"
    assert fn() == "done"
    assert len(calls) == 3


def test_retry_raises_after_exhaustion():
    @retry(max_attempts=2, base_delay=0, jitter=False)
    def fn():
        raise RuntimeError("always fails")
    with pytest.raises(RuntimeError):
        fn()


def test_exponential_backoff_increases():
    d1 = exponential_backoff(1, base=1.0, jitter=False)
    d2 = exponential_backoff(2, base=1.0, jitter=False)
    d3 = exponential_backoff(3, base=1.0, jitter=False)
    assert d1 < d2 < d3


def test_exponential_backoff_capped():
    d = exponential_backoff(100, base=1.0, cap=10.0, jitter=False)
    assert d == 10.0


def test_safe_json_dumps_valid():
    assert safe_json_dumps({"a": 1}) == '{"a": 1}'


def test_safe_json_dumps_fallback():
    class Unserializable:
        pass
    result = safe_json_dumps(Unserializable(), fallback="{}")
    assert isinstance(result, str)


def test_safe_json_loads_valid():
    assert safe_json_loads('{"x": 42}') == {"x": 42}


def test_safe_json_loads_fallback():
    assert safe_json_loads("not json", fallback=None) is None


def test_payload_fingerprint_stable():
    p = {"b": 2, "a": 1}
    assert payload_fingerprint(p) == payload_fingerprint(p)


def test_payload_fingerprint_different_payloads():
    assert payload_fingerprint({"a": 1}) != payload_fingerprint({"a": 2})


def test_chunk():
    result = list(chunk([1, 2, 3, 4, 5], 2))
    assert result == [[1, 2], [3, 4], [5]]


def test_clamp():
    assert clamp(5.0, 0.0, 10.0) == 5.0
    assert clamp(-1.0, 0.0, 10.0) == 0.0
    assert clamp(11.0, 0.0, 10.0) == 10.0


def test_format_duration():
    assert format_duration(0)    == "0s"
    assert format_duration(61)   == "1m 1s"
    assert format_duration(3661) == "1h 1m 1s"
