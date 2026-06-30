"""Tests for flowq/middleware.py — MiddlewareStack."""

import pytest
from flowq.middleware import MiddlewareStack
from flowq.models import Job


@pytest.fixture
def stack():
    s = MiddlewareStack()
    yield s
    s.clear()


def _base(job):
    return "base_result"


def test_wrap_calls_base_handler(stack):
    wrapped = stack.wrap(_base)
    job = Job(name="x")
    assert wrapped(job) == "base_result"


def test_middleware_executed_in_order(stack):
    order = []

    def mw1(job, nxt):
        order.append(1)
        return nxt(job)

    def mw2(job, nxt):
        order.append(2)
        return nxt(job)

    stack.use(mw1)
    stack.use(mw2)
    stack.wrap(_base)(Job(name="x"))
    assert order == [1, 2]


def test_middleware_can_short_circuit(stack):
    def blocker(job, nxt):
        return "blocked"

    stack.use(blocker)
    result = stack.wrap(_base)(Job(name="x"))
    assert result == "blocked"


def test_timing_middleware_does_not_alter_result(stack):
    stack.use(MiddlewareStack.timing())
    result = stack.wrap(_base)(Job(name="x"))
    assert result == "base_result"


def test_payload_validator_raises_on_missing_key(stack):
    stack.use(MiddlewareStack.payload_validator({"required_key": str}))
    with pytest.raises(ValueError, match="missing payload keys"):
        stack.wrap(_base)(Job(name="x", payload={}))


def test_payload_validator_passes_with_key(stack):
    stack.use(MiddlewareStack.payload_validator({"k": str}))
    result = stack.wrap(_base)(Job(name="x", payload={"k": "v"}))
    assert result == "base_result"


def test_remove_middleware(stack):
    called = []
    def mw(job, nxt):
        called.append(True); return nxt(job)
    stack.use(mw)
    stack.remove(mw)
    stack.wrap(_base)(Job(name="x"))
    assert called == []
