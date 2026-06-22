"""Tests for nexusflow.utils.types custom type utilities."""

import pytest

from nexusflow.utils.types import (
    DEFAULT,
    EMPTY,
    MISSING,
    UNSET,
    Result,
    TypeCoercion,
    _SentinelType,
)


class TestSentinels:
    """Tests for sentinel values."""

    def test_missing_is_falsy(self):
        assert not MISSING

    def test_unset_is_falsy(self):
        assert not UNSET

    def test_sentinels_are_distinct(self):
        assert MISSING != UNSET
        assert MISSING != DEFAULT
        assert UNSET != EMPTY

    def test_sentinel_repr(self):
        assert "MISSING" in repr(MISSING)
        assert "UNSET" in repr(UNSET)

    def test_same_name_returns_same_instance(self):
        s1 = _SentinelType.create("TEST_SENTINEL")
        s2 = _SentinelType.create("TEST_SENTINEL")
        assert s1 is s2

    def test_sentinel_hashable(self):
        d = {MISSING: "no value", UNSET: "not set"}
        assert d[MISSING] == "no value"


class TestResult:
    """Tests for the Result monad."""

    def test_ok_result(self):
        r = Result.ok(42)
        assert r.is_ok is True
        assert r.is_err is False
        assert r.unwrap() == 42

    def test_err_result(self):
        r = Result.err("something failed")
        assert r.is_err is True
        assert r.unwrap_err() == "something failed"

    def test_unwrap_on_err_raises(self):
        r = Result.err("bad")
        with pytest.raises(ValueError, match="Err"):
            r.unwrap()

    def test_unwrap_err_on_ok_raises(self):
        r = Result.ok(1)
        with pytest.raises(ValueError, match="Ok"):
            r.unwrap_err()

    def test_unwrap_or(self):
        assert Result.ok(10).unwrap_or(0) == 10
        assert Result.err("fail").unwrap_or(0) == 0

    def test_map(self):
        r = Result.ok(5).map(lambda x: x * 2)
        assert r.unwrap() == 10

    def test_map_on_err(self):
        r = Result.err("fail").map(lambda x: x * 2)
        assert r.is_err

    def test_map_err(self):
        r = Result.err("fail").map_err(lambda e: e.upper())
        assert r.unwrap_err() == "FAIL"

    def test_and_then(self):
        r = Result.ok(5).and_then(lambda x: Result.ok(x + 1))
        assert r.unwrap() == 6

    def test_and_then_short_circuits(self):
        r = Result.err("stop").and_then(lambda x: Result.ok(x + 1))
        assert r.is_err

    def test_repr(self):
        assert "Ok(42)" in repr(Result.ok(42))
        assert "Err" in repr(Result.err("bad"))


class TestTypeCoercion:
    """Tests for the TypeCoercion system."""

    def test_str_to_int(self):
        tc = TypeCoercion()
        assert tc.coerce("42", int) == 42

    def test_str_to_float(self):
        tc = TypeCoercion()
        assert tc.coerce("3.14", float) == pytest.approx(3.14)

    def test_str_to_bool(self):
        tc = TypeCoercion()
        assert tc.coerce("true", bool) is True

    def test_identity_coercion(self):
        tc = TypeCoercion()
        assert tc.coerce(42, int) == 42

    def test_cannot_coerce_raises(self):
        tc = TypeCoercion()
        with pytest.raises(TypeError):
            tc.coerce(object(), int)

    def test_can_coerce_check(self):
        tc = TypeCoercion()
        assert tc.can_coerce(str, int) is True
        assert tc.can_coerce(int, int) is True

    def test_register_custom_coercion(self):
        tc = TypeCoercion()
        tc.register(str, list, lambda s: s.split(","))
        assert tc.coerce("a,b,c", list) == ["a", "b", "c"]
