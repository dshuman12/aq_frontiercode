"""Tests for flowq/events.py — EventEmitter."""

import pytest
from flowq.events import EventEmitter


@pytest.fixture
def emitter():
    return EventEmitter()


def test_subscribe_and_emit(emitter):
    results = []
    emitter.subscribe("test.event", lambda x: results.append(x))
    emitter.emit("test.event", 42)
    assert results == [42]


def test_on_decorator(emitter):
    calls = []
    @emitter.on("job.done")
    def handler(job): calls.append(job)
    emitter.emit("job.done", "myjob")
    assert calls == ["myjob"]


def test_multiple_listeners(emitter):
    log = []
    emitter.subscribe("e", lambda: log.append(1))
    emitter.subscribe("e", lambda: log.append(2))
    emitter.emit("e")
    assert log == [1, 2]


def test_unsubscribe(emitter):
    calls = []
    fn = lambda: calls.append(1)
    emitter.subscribe("e", fn)
    emitter.unsubscribe("e", fn)
    emitter.emit("e")
    assert calls == []


def test_emit_unknown_event_is_silent(emitter):
    emitter.emit("no.such.event")   # must not raise


def test_listener_exception_does_not_propagate(emitter):
    emitter.subscribe("e", lambda: 1 / 0)
    emitter.emit("e")   # should not raise


def test_clear_all(emitter):
    calls = []
    emitter.subscribe("a", lambda: calls.append("a"))
    emitter.subscribe("b", lambda: calls.append("b"))
    emitter.clear()
    emitter.emit("a"); emitter.emit("b")
    assert calls == []


def test_event_names(emitter):
    emitter.subscribe("x", lambda: None)
    emitter.subscribe("y", lambda: None)
    assert set(emitter.event_names()) == {"x", "y"}
