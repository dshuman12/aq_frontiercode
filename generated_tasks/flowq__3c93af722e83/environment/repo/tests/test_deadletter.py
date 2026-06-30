"""Tests for flowq/deadletter.py — DeadLetterQueue."""

import pytest
from flowq.deadletter import DeadLetterQueue, DeadLetterEntry
from flowq.models import Job, JobStatus
from flowq.queue import JobQueue


@pytest.fixture
def dlq():
    return DeadLetterQueue(max_size=100)


@pytest.fixture
def failed_job():
    job = Job(name="failing_task")
    job.mark_running()
    job.mark_failed("something went wrong")
    return job


def test_add_increases_length(dlq, failed_job):
    dlq.add(failed_job, "exhausted retries")
    assert len(dlq) == 1


def test_get_by_job_id(dlq, failed_job):
    dlq.add(failed_job, "exhausted retries")
    entry = dlq.get(failed_job.id)
    assert entry is not None
    assert entry.job.id == failed_job.id


def test_get_missing_returns_none(dlq):
    assert dlq.get("nonexistent") is None


def test_not_replayed_initially(dlq, failed_job):
    dlq.add(failed_job, "reason")
    assert len(dlq.not_replayed()) == 1


def test_replay_re_enqueues_job(dlq, failed_job):
    dlq.add(failed_job, "reason")
    queue = JobQueue()
    result = dlq.replay(failed_job.id, queue, reset_retries=True)
    assert result is True
    assert failed_job.status == JobStatus.PENDING
    assert len(queue) == 1


def test_replay_resets_retries(dlq, failed_job):
    failed_job.retries_used = 3
    dlq.add(failed_job, "reason")
    dlq.replay(failed_job.id, JobQueue(), reset_retries=True)
    assert failed_job.retries_used == 0


def test_replay_marks_as_replayed(dlq, failed_job):
    dlq.add(failed_job, "reason")
    dlq.replay(failed_job.id, JobQueue())
    entry = dlq.get(failed_job.id)
    assert entry.replayed is True
    assert entry.replayed_at is not None


def test_replay_already_replayed_returns_false(dlq, failed_job):
    dlq.add(failed_job, "reason")
    dlq.replay(failed_job.id, JobQueue())
    assert dlq.replay(failed_job.id, JobQueue()) is False


def test_max_size_evicts_oldest(dlq):
    dlq2 = DeadLetterQueue(max_size=2)
    j1, j2, j3 = Job(name="a"), Job(name="b"), Job(name="c")
    for j in (j1, j2, j3):
        j.mark_running(); j.mark_failed("x")
        dlq2.add(j, "x")
    assert len(dlq2) == 2
    assert dlq2.get(j1.id) is None   # oldest evicted


def test_purge_replayed(dlq, failed_job):
    dlq.add(failed_job, "reason")
    dlq.replay(failed_job.id, JobQueue())
    removed = dlq.purge_replayed()
    assert removed == 1
    assert len(dlq) == 0
