"""Tests for flowq.job_groups."""

import pytest
from flowq.job_groups import JobGroup, GroupStats, JobGroupError
from flowq.models import Job, JobStatus, Priority
from flowq.queue import JobQueue
from flowq.storage import Storage
from flowq.worker import register, Worker


@register("noop")
def noop_handler(job):
    pass


@register("fail_handler")
def fail_handler(job):
    raise RuntimeError("intentional failure")


@pytest.fixture()
def storage(tmp_path):
    return Storage(str(tmp_path / "test.db"))


@pytest.fixture()
def queue():
    return JobQueue()


@pytest.fixture()
def worker(storage):
    return Worker(storage=storage)


def test_add_jobs_to_group(queue, storage):
    group = JobGroup("g1", queue, storage)
    group.add("noop", {"x": 1})
    group.add("noop", {"x": 2})
    assert len(group) == 2


def test_submit_all_enqueues(queue, storage):
    group = JobGroup("g2", queue, storage)
    group.add("noop", {})
    group.add("noop", {})
    count = group.submit_all()
    assert count == 2
    assert len(queue) == 2


def test_cannot_add_after_submit(queue, storage):
    group = JobGroup("g3", queue, storage)
    group.add("noop", {})
    group.submit_all()
    with pytest.raises(JobGroupError):
        group.add("noop", {})


def test_cannot_submit_twice(queue, storage):
    group = JobGroup("g4", queue, storage)
    group.add("noop", {})
    group.submit_all()
    with pytest.raises(JobGroupError):
        group.submit_all()


def test_jobs_tagged_with_group_id(queue, storage):
    group = JobGroup("g5", queue, storage)
    job = group.add("noop", {})
    assert any(t.startswith("group:") for t in job.tags)


def test_stats_returns_groupstats(queue, storage, worker):
    group = JobGroup("g6", queue, storage)
    group.add("noop", {})
    group.submit_all()
    job = queue.dequeue()
    worker.run_job(job)
    stats = group.stats()
    assert isinstance(stats, GroupStats)
    assert stats.total == 1
    assert stats.success == 1


def test_is_complete_after_all_run(queue, storage, worker):
    group = JobGroup("g7", queue, storage)
    for _ in range(3):
        group.add("noop", {})
    group.submit_all()
    while (job := queue.dequeue()):
        worker.run_job(job)
    assert group.is_complete()


def test_group_repr(queue, storage):
    group = JobGroup("mygroup", queue, storage)
    assert "mygroup" in repr(group)


def test_group_stats_success_rate(queue, storage, worker):
    group = JobGroup("g8", queue, storage)
    group.add("noop", {})
    group.submit_all()
    job = queue.dequeue()
    worker.run_job(job)
    stats = group.stats()
    assert stats.success_rate == 1.0


def test_to_dict_has_keys(queue, storage):
    group = JobGroup("g9", queue, storage)
    group.add("noop", {})
    group.submit_all()
    d = group.to_dict()
    assert "id" in d
    assert "name" in d
    assert "job_count" in d
