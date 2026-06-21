"""Tests for nexusflow.events.replay event store and replay."""

import time
import pytest

from nexusflow.events.replay import EventStore, StoredEvent


class TestEventStore:
    """Tests for appending and querying events."""

    def test_append_event(self):
        store = EventStore()
        event = store.append("e1", "user.created", {"name": "Alice"})
        assert isinstance(event, StoredEvent)
        assert event.event_id == "e1"
        assert event.event_type == "user.created"
        assert event.sequence == 1

    def test_append_increments_sequence(self):
        store = EventStore()
        e1 = store.append("e1", "a", {})
        e2 = store.append("e2", "b", {})
        assert e2.sequence == e1.sequence + 1

    def test_get_events_all(self):
        store = EventStore()
        store.append("e1", "a", {})
        store.append("e2", "b", {})
        events = store.get_events()
        assert len(events) == 2

    def test_get_events_by_type(self):
        store = EventStore()
        store.append("e1", "user.created", {})
        store.append("e2", "order.placed", {})
        store.append("e3", "user.created", {})
        events = store.get_events(event_type="user.created")
        assert len(events) == 2

    def test_get_events_by_source(self):
        store = EventStore()
        store.append("e1", "a", {}, source="api")
        store.append("e2", "b", {}, source="worker")
        events = store.get_events(source="api")
        assert len(events) == 1

    def test_get_events_with_limit(self):
        store = EventStore()
        for i in range(10):
            store.append(f"e{i}", "test", {})
        events = store.get_events(limit=3)
        assert len(events) == 3

    def test_get_events_time_range(self):
        store = EventStore()
        store.append("e1", "a", {})
        mid = time.time()
        time.sleep(0.05)
        store.append("e2", "b", {})
        events = store.get_events(after=mid)
        assert len(events) == 1
        assert events[0].event_id == "e2"


class TestEventReplay:
    """Tests for replaying events."""

    def test_replay_all(self):
        store = EventStore()
        store.append("e1", "a", {"val": 1})
        store.append("e2", "b", {"val": 2})
        replayed = []
        count = store.replay(handler=lambda e: replayed.append(e.event_id))
        assert count == 2
        assert replayed == ["e1", "e2"]

    def test_replay_by_type(self):
        store = EventStore()
        store.append("e1", "user.created", {})
        store.append("e2", "order.placed", {})
        replayed = []
        count = store.replay(
            handler=lambda e: replayed.append(e.event_type),
            event_type="user.created",
        )
        assert count == 1

    def test_replay_after_sequence(self):
        store = EventStore()
        store.append("e1", "a", {})
        store.append("e2", "b", {})
        store.append("e3", "c", {})
        replayed = []
        count = store.replay(
            handler=lambda e: replayed.append(e.event_id),
            after_sequence=2,
        )
        assert count == 1
        assert replayed == ["e3"]

    def test_replay_with_transform(self):
        store = EventStore()
        store.append("e1", "test", {"val": 10})
        results = []

        def transform(e):
            e.payload["val"] *= 2
            return e

        store.replay(
            handler=lambda e: results.append(e.payload["val"]),
            transform=transform,
        )
        assert results == [20]


class TestEventSnapshots:
    """Tests for snapshot management."""

    def test_create_and_get_snapshot(self):
        store = EventStore()
        store.append("e1", "a", {})
        store.create_snapshot("snap1", {"counter": 5})
        snap = store.get_snapshot("snap1")
        assert snap is not None
        assert snap["state"]["counter"] == 5
        assert snap["sequence"] == 1

    def test_get_nonexistent_snapshot(self):
        store = EventStore()
        assert store.get_snapshot("nope") is None

    def test_stored_event_to_dict(self):
        store = EventStore()
        event = store.append("e1", "test", {"a": 1}, source="api")
        d = event.to_dict()
        assert d["event_id"] == "e1"
        assert d["payload"]["a"] == 1
        assert d["source"] == "api"
