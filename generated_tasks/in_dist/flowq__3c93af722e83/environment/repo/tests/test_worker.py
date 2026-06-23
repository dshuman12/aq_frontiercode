"""Tests for flowq/worker.py — Worker and WorkerPool."""

import time
import pytest
from flowq.models import Job, JobStatus
from flowq.queue import JobQueue
from flowq.worker import Worker, WorkerPool, register, _HANDLERS


@pytest.fixture(autouse=True)
def clear_handlers():
    _HANDLERS.clear()
    yield
    _HANDLERS.clear()


def test_register_adds_handler():
    @register("my_job")
    def handler(payload): return "done"
    assert "my_job" in _HANDLERS


def test_worker_executes_job_successfully():
    @register("add")
    def add(payload): return payload["a"] + payload["b"]

    q = JobQueue()
    job = Job(name="add", payload={"a": 2, "b": 3})
    q.enqueue(job)
    w = Worker(queue=q)
    w.run_job(q.dequeue())
    assert job.status == JobStatus.SUCCESS
    assert job.result == 5


def test_worker_marks_failed_on_exception():
    @register("boom")
    def boom(payload): raise RuntimeError("explosion")

    q = JobQueue()
    job = Job(name="boom", max_retries=0)
    q.enqueue(job)
    w = Worker(queue=q)
    w.run_job(q.dequeue())
    assert job.status == JobStatus.FAILED
    assert "explosion" in job.error


def test_worker_retries_on_failure():
    call_count = {"n": 0}

    @register("flaky")
    def flaky(payload):
        call_count["n"] += 1
        if call_count["n"] < 3:
            raise ValueError("not yet")
        return "ok"

    q = JobQueue()
    job = Job(name="flaky", max_retries=3)
    q.enqueue(job)
    w = Worker(queue=q)

    # Run until success or exhausted
    for _ in range(5):
        j = q.dequeue()
        if j is None: break
        w.run_job(j)

    assert job.status == JobStatus.SUCCESS


def test_worker_timeout_marks_failed():
    @register("slow")
    def slow(payload): time.sleep(10)

    q = JobQueue()
    job = Job(name="slow", timeout=1, max_retries=0)
    q.enqueue(job)
    w = Worker(queue=q)
    w.run_job(q.dequeue())
    assert job.status == JobStatus.FAILED
    assert "timeout" in job.error.lower()


def test_unregistered_handler_fails_job():
    q = JobQueue()
    job = Job(name="unknown_job", max_retries=0)
    q.enqueue(job)
    w = Worker(queue=q)
    w.run_job(q.dequeue())
    assert job.status == JobStatus.FAILED
