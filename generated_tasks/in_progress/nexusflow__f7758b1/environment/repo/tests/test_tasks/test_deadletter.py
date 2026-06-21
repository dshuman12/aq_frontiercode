"""Tests for nexusflow.tasks.deadletter.DeadLetterQueue."""

import pytest

from nexusflow.tasks.deadletter import DeadLetterEntry, DeadLetterQueue


class TestDeadLetterQueue:
    """Tests for basic DLQ operations."""

    def test_add_entry(self):
        dlq = DeadLetterQueue()
        entry_id = dlq.add(
            task_id="t1",
            task_name="process_order",
            payload={"order_id": 123},
            error="Connection refused",
        )
        assert isinstance(entry_id, str)

    def test_get_entry(self):
        dlq = DeadLetterQueue()
        entry_id = dlq.add("t1", "task", {}, "error")
        entry = dlq.get(entry_id)
        assert entry is not None
        assert entry.task_id == "t1"

    def test_get_nonexistent_returns_none(self):
        dlq = DeadLetterQueue()
        assert dlq.get("nope") is None

    def test_get_by_task_id(self):
        dlq = DeadLetterQueue()
        dlq.add("t1", "job_a", {}, "err1")
        dlq.add("t1", "job_a", {}, "err2")
        dlq.add("t2", "job_b", {}, "err3")
        entries = dlq.get_by_task("t1")
        assert len(entries) == 2

    def test_get_by_error_type(self):
        dlq = DeadLetterQueue()
        dlq.add("t1", "a", {}, "err", error_type="TimeoutError")
        dlq.add("t2", "b", {}, "err", error_type="ValueError")
        entries = dlq.get_by_error_type("TimeoutError")
        assert len(entries) == 1

    def test_get_all_with_limit(self):
        dlq = DeadLetterQueue()
        for i in range(10):
            dlq.add(f"t{i}", "job", {}, "err")
        entries = dlq.get_all(limit=5)
        assert len(entries) == 5

    def test_get_all_with_tag_filter(self):
        dlq = DeadLetterQueue()
        dlq.add("t1", "a", {}, "err", tags={"critical"})
        dlq.add("t2", "b", {}, "err", tags={"low"})
        entries = dlq.get_all(tag="critical")
        assert len(entries) == 1


class TestRequeue:
    """Tests for requeue behavior."""

    def test_requeue_entry(self):
        dlq = DeadLetterQueue()
        eid = dlq.add("t1", "job", {"data": 1}, "err", max_retries=3)
        result = dlq.requeue(eid)
        assert result is not None
        assert result["task_id"] == "t1"
        assert result["metadata"]["requeued_from_dlq"] is True

    def test_requeue_increments_count(self):
        dlq = DeadLetterQueue()
        eid = dlq.add("t1", "job", {}, "err", max_retries=5)
        dlq.requeue(eid)
        entry = dlq.get(eid)
        assert entry.requeue_count == 1

    def test_requeue_nonexistent_returns_none(self):
        dlq = DeadLetterQueue()
        assert dlq.requeue("fake-id") is None

    def test_can_requeue_with_max_retries_none(self):
        entry = DeadLetterEntry(task_id="t1", max_retries=None)
        dlq = DeadLetterQueue()
        assert dlq.can_requeue(entry) is True

    def test_can_requeue_respects_limit(self):
        entry = DeadLetterEntry(task_id="t1", max_retries=2, requeue_count=2)
        dlq = DeadLetterQueue()
        assert dlq.can_requeue(entry) is False


class TestEviction:
    """Tests for DLQ size management."""

    def test_eviction_at_max_size(self):
        dlq = DeadLetterQueue(max_size=3)
        dlq.add("t1", "a", {}, "e1")
        dlq.add("t2", "b", {}, "e2")
        dlq.add("t3", "c", {}, "e3")
        dlq.add("t4", "d", {}, "e4")
        # Should have evicted the oldest
        all_entries = dlq.get_all(limit=100)
        assert len(all_entries) == 3

    def test_entry_to_dict(self):
        entry = DeadLetterEntry(
            task_id="t1", task_name="job", error="boom",
            attempts=3, max_retries=5,
        )
        d = entry.to_dict()
        assert d["task_id"] == "t1"
        assert d["error"] == "boom"
        assert d["attempts"] == 3

    def test_hooks_on_add(self):
        dlq = DeadLetterQueue()
        notifications = []
        dlq._on_add_hooks.append(lambda e: notifications.append(e.task_id))
        dlq.add("t1", "job", {}, "err")
        assert "t1" in notifications
