"""Tests for flowq.backends.file_backend."""

import pytest
from flowq.backends.file_backend import FileBackend
from flowq.models import Job, JobStatus
from flowq.exceptions import JobNotFoundError, StorageError, DuplicateJobError


@pytest.fixture()
def backend(tmp_path):
    return FileBackend(str(tmp_path / "jobs"))


@pytest.fixture()
def job():
    return Job(name="test", payload={"k": "v"})


def test_save_and_fetch(backend, job):
    backend.save(job)
    fetched = backend.fetch(job.id)
    assert fetched.id == job.id
    assert fetched.payload == job.payload


def test_fetch_missing_raises(backend):
    with pytest.raises(JobNotFoundError):
        backend.fetch("nonexistent-id")


def test_duplicate_save_raises(backend, job):
    backend.save(job)
    with pytest.raises(DuplicateJobError):
        backend.save(job)


def test_update_status(backend, job):
    backend.save(job)
    job.mark_running()
    backend.update(job)
    fetched = backend.fetch(job.id)
    assert fetched.status == JobStatus.RUNNING


def test_update_missing_raises(backend, job):
    with pytest.raises(JobNotFoundError):
        backend.update(job)


def test_delete_removes_job(backend, job):
    backend.save(job)
    backend.delete(job.id)
    with pytest.raises(JobNotFoundError):
        backend.fetch(job.id)


def test_delete_missing_raises(backend):
    with pytest.raises(JobNotFoundError):
        backend.delete("ghost")


def test_list_all(backend):
    jobs = [Job(name="j", payload={}) for _ in range(3)]
    for j in jobs:
        backend.save(j)
    listed = backend.list_jobs()
    assert len(listed) == 3


def test_list_filtered_by_status(backend):
    j1 = Job(name="a", payload={})
    j2 = Job(name="b", payload={})
    backend.save(j1)
    backend.save(j2)
    j2.mark_running()
    backend.update(j2)
    pending = backend.list_jobs(status=JobStatus.PENDING)
    assert all(j.status == JobStatus.PENDING for j in pending)


def test_search_by_tag(backend):
    j1 = Job(name="tagged", payload={}, tags=["urgent"])
    j2 = Job(name="plain",  payload={})
    backend.save(j1)
    backend.save(j2)
    results = backend.search_by_tag("urgent")
    assert len(results) == 1
    assert results[0].id == j1.id


def test_count_by_status(backend):
    for _ in range(2):
        j = Job(name="n", payload={})
        backend.save(j)
    counts = backend.count_by_status()
    assert counts["PENDING"] == 2


def test_health_check(backend):
    result = backend.health_check()
    assert "root" in result


def test_payload_preserved_through_round_trip(backend):
    payload = {"nested": {"a": [1, 2, 3]}, "flag": True, "count": 42}
    j = Job(name="rich", payload=payload)
    backend.save(j)
    fetched = backend.fetch(j.id)
    assert fetched.payload == payload
