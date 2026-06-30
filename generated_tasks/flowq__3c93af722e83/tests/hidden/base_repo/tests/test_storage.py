"""Tests for flowq/storage.py — Storage class."""

import pytest
from flowq.models import Job, JobStatus, Priority
from flowq.storage import Storage
from flowq.exceptions import DuplicateJobError, JobNotFoundError


def test_save_and_fetch_round_trip(storage, simple_job):
    storage.save(simple_job)
    fetched = storage.fetch(simple_job.id)
    assert fetched.id   == simple_job.id
    assert fetched.name == simple_job.name


def test_fetch_missing_raises(storage):
    with pytest.raises(JobNotFoundError):
        storage.fetch("no-such-id")


def test_duplicate_save_raises(storage, simple_job):
    storage.save(simple_job)
    with pytest.raises(DuplicateJobError):
        storage.save(simple_job)


def test_payload_preserved(storage):
    job = Job(name="x", payload={"key": "value", "n": 42})
    storage.save(job)
    assert storage.fetch(job.id).payload == {"key": "value", "n": 42}



def test_update_status(storage, simple_job):
    storage.save(simple_job)
    simple_job.mark_running()
    storage.update(simple_job)
    assert storage.fetch(simple_job.id).status == JobStatus.RUNNING


def test_update_missing_raises(storage, simple_job):
    with pytest.raises(JobNotFoundError):
        storage.update(simple_job)


def test_delete_removes_job(storage, simple_job):
    storage.save(simple_job)
    storage.delete(simple_job.id)
    with pytest.raises(JobNotFoundError):
        storage.fetch(simple_job.id)


def test_delete_missing_raises(storage):
    with pytest.raises(JobNotFoundError):
        storage.delete("no-such-id")



def test_list_jobs_returns_all(populated_storage):
    jobs = populated_storage.list_jobs()
    assert len(jobs) == 3


def test_list_jobs_filter_by_status(storage, simple_job):
    storage.save(simple_job)
    simple_job.mark_running(); storage.update(simple_job)
    assert len(storage.list_jobs(status=JobStatus.RUNNING)) == 1
    assert len(storage.list_jobs(status=JobStatus.PENDING)) == 0


def test_search_by_tag_found(storage):
    job = Job(name="x", tags=["urgent", "billing"])
    storage.save(job)
    assert len(storage.search_by_tag("urgent")) == 1


def test_search_by_tag_not_found(storage, simple_job):
    storage.save(simple_job)
    assert storage.search_by_tag("no-such-tag") == []


def test_count_by_status(populated_storage):
    counts = populated_storage.count_by_status()
    assert counts.get("pending", 0) == 3
