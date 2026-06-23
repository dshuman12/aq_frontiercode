"""Tests for flowq/queue.py — JobQueue."""

import pytest
from flowq.models import Job, JobStatus, Priority
from flowq.queue import JobQueue
from flowq.exceptions import DuplicateJobError, JobNotFoundError, QueueFullError


def test_empty_queue_len_is_zero(queue):
    assert len(queue) == 0


def test_enqueue_increments_length(queue, simple_job):
    queue.enqueue(simple_job)
    assert len(queue) == 1


def test_dequeue_returns_job(queue, simple_job):
    queue.enqueue(simple_job)
    assert queue.dequeue().id == simple_job.id


def test_dequeue_empty_returns_none(queue):
    assert queue.dequeue() is None


def test_contains_true_after_enqueue(queue, simple_job):
    queue.enqueue(simple_job)
    assert simple_job.id in queue



def test_higher_priority_dequeued_first(queue, simple_job, high_job, low_job):
    queue.enqueue(simple_job)
    queue.enqueue(low_job)
    queue.enqueue(high_job)
    first = queue.dequeue()
    assert first.priority == Priority.HIGH


def test_fifo_within_same_priority():
    q = JobQueue()
    j1 = Job(name="first",  priority=Priority.NORMAL)
    j2 = Job(name="second", priority=Priority.NORMAL)
    q.enqueue(j1); q.enqueue(j2)
    assert q.dequeue().name == "first"


def test_duplicate_job_raises(queue, simple_job):
    queue.enqueue(simple_job)
    with pytest.raises(DuplicateJobError):
        queue.enqueue(simple_job)



def test_queue_full_raises(bounded_queue):
    for i in range(3):
        bounded_queue.enqueue(Job(name=f"job{i}"))
    with pytest.raises(QueueFullError):
        bounded_queue.enqueue(Job(name="overflow"))


def test_cancel_marks_job_cancelled(queue, simple_job):
    queue.enqueue(simple_job)
    queue.cancel(simple_job.id)
    assert simple_job.status == JobStatus.CANCELLED


def test_cancel_nonexistent_raises(queue):
    with pytest.raises(JobNotFoundError):
        queue.cancel("nonexistent-id")


def test_filter_by_status(queue, simple_job, high_job):
    queue.enqueue(simple_job); queue.enqueue(high_job)
    pending = queue.filter_by_status(JobStatus.PENDING)
    assert len(pending) == 2


def test_filter_by_tag(queue):
    j = Job(name="tagged", tags=["alpha", "beta"])
    queue.enqueue(j)
    assert len(queue.filter_by_tag("alpha")) == 1
    assert len(queue.filter_by_tag("gamma")) == 0
