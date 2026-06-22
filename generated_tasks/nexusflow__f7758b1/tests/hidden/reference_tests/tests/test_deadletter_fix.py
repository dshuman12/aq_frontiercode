"""Tests for DeadLetter max_retries=0 boundary handling."""
import pytest
from nexusflow.tasks.deadletter import DeadLetterQueue, DeadLetterEntry


def test_max_retries_zero_disallows_requeue():
    dlq = DeadLetterQueue()
    entry = DeadLetterEntry(
        task_id="t1", payload={}, error="err",
        max_retries=0, requeue_count=0
    )
    dlq._entries[entry.entry_id] = entry
    assert not dlq.can_requeue(entry), "max_retries=0 should disallow requeue"


def test_max_retries_none_allows_requeue():
    dlq = DeadLetterQueue()
    entry = DeadLetterEntry(
        task_id="t1", payload={}, error="err",
        max_retries=None, requeue_count=0
    )
    dlq._entries[entry.entry_id] = entry
    assert dlq.can_requeue(entry), "max_retries=None should allow unlimited requeue"


def test_max_retries_positive_exhausted():
    dlq = DeadLetterQueue()
    entry = DeadLetterEntry(
        task_id="t1", payload={}, error="err",
        max_retries=2, requeue_count=2
    )
    dlq._entries[entry.entry_id] = entry
    assert not dlq.can_requeue(entry), "exhausted retries should disallow requeue"
