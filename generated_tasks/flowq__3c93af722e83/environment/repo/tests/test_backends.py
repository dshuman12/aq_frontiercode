"""Tests for flowq/backends — MemoryBackend and SQLiteBackend."""

import pytest
from flowq.models import Job, JobStatus, Priority
from flowq.backends.memory_backend import MemoryBackend
from flowq.backends.sqlite_backend import SQLiteBackend
from flowq.exceptions import DuplicateJobError, JobNotFoundError


@pytest.fixture(params=["memory", "sqlite"])
def backend(request):
    if request.param == "memory":
        return MemoryBackend()
    return SQLiteBackend(":memory:")


def test_save_and_fetch(backend):
    job = Job(name="x")
    backend.save(job)
    assert backend.fetch(job.id).id == job.id


def test_duplicate_raises(backend):
    job = Job(name="x")
    backend.save(job)
    with pytest.raises(DuplicateJobError):
        backend.save(job)


def test_fetch_missing_raises(backend):
    with pytest.raises(JobNotFoundError):
        backend.fetch("no-such-id")


def test_update_status(backend):
    job = Job(name="x")
    backend.save(job)
    job.mark_running()
    backend.update(job)
    assert backend.fetch(job.id).status == JobStatus.RUNNING


def test_delete(backend):
    job = Job(name="x")
    backend.save(job)
    backend.delete(job.id)
    with pytest.raises(JobNotFoundError):
        backend.fetch(job.id)


def test_list_all(backend):
    for i in range(3):
        backend.save(Job(name=f"job{i}"))
    assert len(backend.list_jobs()) == 3


def test_list_filtered_by_status(backend):
    job = Job(name="x")
    backend.save(job)
    assert len(backend.list_jobs(status=JobStatus.PENDING)) == 1
    assert len(backend.list_jobs(status=JobStatus.RUNNING)) == 0


def test_search_by_tag(backend):
    job = Job(name="x", tags=["alpha"])
    backend.save(job)
    assert len(backend.search_by_tag("alpha")) == 1
    assert len(backend.search_by_tag("beta")) == 0


def test_count_by_status(backend):
    backend.save(Job(name="a"))
    backend.save(Job(name="b"))
    counts = backend.count_by_status()
    assert counts.get("pending", 0) == 2


def test_health_check(backend):
    assert backend.health_check() is True
