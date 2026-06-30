"""Shared pytest fixtures for FlowQ tests."""

import pytest
from flowq.models import Job, Priority
from flowq.queue import JobQueue
from flowq.storage import Storage


@pytest.fixture
def simple_job():
    return Job(name="test_job", payload={"x": 1})


@pytest.fixture
def high_job():
    return Job(name="urgent", payload={}, priority=Priority.HIGH)


@pytest.fixture
def low_job():
    return Job(name="background", payload={}, priority=Priority.LOW)


@pytest.fixture
def queue():
    return JobQueue()


@pytest.fixture
def bounded_queue():
    return JobQueue(capacity=3)


@pytest.fixture
def storage():
    return Storage(":memory:")


@pytest.fixture
def populated_storage(storage, simple_job, high_job, low_job):
    storage.save(simple_job)
    storage.save(high_job)
    storage.save(low_job)
    return storage
