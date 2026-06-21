"""Tests for nexusflow.events.bus.EventBus."""

import pytest

from nexusflow.events.bus import (
    Event,
    EventBus,
    EventPriority,
    EventStats,
    HandlerRegistration,
)


@pytest.fixture
def event_bus():
    return EventBus()


class TestEventBusSubscription:
    """Tests for subscribing to events."""

    def test_on_returns_handler_id(self, event_bus):
        handler_id = event_bus.on("user.created", lambda e: None)
        assert isinstance(handler_id, str)
        assert len(handler_id) > 0

    def test_off_removes_handler(self, event_bus):
        handler_id = event_bus.on("user.created", lambda e: None)
        assert event_bus.off(handler_id) is True

    def test_off_unknown_id_returns_false(self, event_bus):
        assert event_bus.off("nonexistent") is False

    def test_once_handler_called_only_once(self, event_bus):
        calls = []
        event_bus.once("ping", lambda e: calls.append(1))
        event_bus.emit("ping")
        event_bus.emit("ping")
        assert len(calls) == 1

    def test_wildcard_handler(self, event_bus):
        received = []
        event_bus.on("*", lambda e: received.append(e.type))
        event_bus.emit("foo")
        event_bus.emit("bar")
        assert "foo" in received
        assert "bar" in received


class TestEventBusEmit:
    """Tests for emitting events."""

    def test_emit_string_creates_event(self, event_bus):
        received = []
        event_bus.on("test", lambda e: received.append(e))
        event_bus.emit("test", payload={"key": "val"})
        assert len(received) == 1
        assert received[0].payload["key"] == "val"

    def test_emit_event_object(self, event_bus):
        received = []
        event_bus.on("custom", lambda e: received.append(e))
        event = Event(type="custom", payload={"data": 42})
        event_bus.emit(event)
        assert received[0].payload["data"] == 42

    def test_handlers_called_in_priority_order(self, event_bus):
        order = []
        event_bus.on("test", lambda e: order.append("low"), priority=EventPriority.LOW.value)
        event_bus.on("test", lambda e: order.append("high"), priority=EventPriority.HIGH.value)
        event_bus.on("test", lambda e: order.append("normal"), priority=EventPriority.NORMAL.value)
        event_bus.emit("test")
        assert order.index("high") < order.index("normal") < order.index("low")

    def test_handler_filter_fn(self, event_bus):
        received = []
        event_bus.on(
            "order",
            lambda e: received.append(e.payload),
            filter_fn=lambda e: e.payload.get("amount", 0) > 100,
        )
        event_bus.emit(Event(type="order", payload={"amount": 50}))
        event_bus.emit(Event(type="order", payload={"amount": 200}))
        assert len(received) == 1
        assert received[0]["amount"] == 200

    def test_multiple_handlers_all_called(self, event_bus):
        results = []
        event_bus.on("test", lambda e: results.append("a"))
        event_bus.on("test", lambda e: results.append("b"))
        event_bus.emit("test")
        assert "a" in results
        assert "b" in results


class TestEventPropagation:
    """Tests for event propagation control."""

    def test_stop_propagation(self, event_bus):
        order = []

        def stopper(e):
            order.append("first")
            e.stop_propagation()

        event_bus.on("test", stopper, priority=EventPriority.HIGH.value)
        event_bus.on("test", lambda e: order.append("second"), priority=EventPriority.LOW.value)
        event_bus.emit("test")
        assert order == ["first"]

    def test_is_propagation_stopped(self):
        event = Event(type="test")
        assert event.is_propagation_stopped is False
        event.stop_propagation()
        assert event.is_propagation_stopped is True


class TestEventMiddleware:
    """Tests for event middleware."""

    def test_use_middleware(self, event_bus):
        transformed = []

        def add_metadata(event):
            event.metadata["processed"] = True
            return event

        event_bus.use(add_metadata)
        event_bus.on("test", lambda e: transformed.append(e.metadata.get("processed")))
        event_bus.emit("test")
        assert transformed == [True]


class TestEventStats:
    """Tests for event statistics tracking."""

    def test_stats_initialized(self, event_bus):
        stats = event_bus._stats
        assert stats.events_dispatched == 0
        assert stats.handlers_called == 0

    def test_stats_after_emit(self, event_bus):
        event_bus.on("test", lambda e: None)
        event_bus.emit("test")
        assert event_bus._stats.events_dispatched >= 1

    def test_stats_to_dict(self):
        stats = EventStats()
        stats.record_dispatch("test", 0.01)
        stats.record_handler()
        d = stats.to_dict()
        assert d["events_dispatched"] == 1
        assert d["handlers_called"] == 1


class TestEvent:
    """Tests for the Event dataclass."""

    def test_event_defaults(self):
        e = Event(type="test")
        assert e.type == "test"
        assert e.payload == {}
        assert e.id  # UUID generated
        assert e.timestamp > 0

    def test_event_to_dict(self):
        e = Event(type="test", payload={"k": "v"}, source="unit-test")
        d = e.to_dict()
        assert d["type"] == "test"
        assert d["source"] == "unit-test"
        assert d["payload"]["k"] == "v"

    def test_error_handler_called(self, event_bus):
        errors = []
        event_bus.set_error_handler(lambda e, exc: errors.append(str(exc)))

        def bad_handler(e):
            raise ValueError("boom")

        event_bus.on("fail", bad_handler)
        event_bus.emit("fail")
        assert len(errors) == 1
        assert "boom" in errors[0]
