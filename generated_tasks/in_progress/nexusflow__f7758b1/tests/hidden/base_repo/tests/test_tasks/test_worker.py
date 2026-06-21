"""Tests for nexusflow.tasks.worker retry logic."""

import pytest

from nexusflow.tasks.worker import (
    RetryPolicy,
    TaskExecution,
    Worker,
    WorkerState,
    WorkerTask,
)


class TestRetryPolicy:
    """Tests for the RetryPolicy."""

    def test_should_retry_within_limit(self):
        policy = RetryPolicy(max_retries=3)
        assert policy.should_retry(ValueError("err"), attempt=0) is True
        assert policy.should_retry(ValueError("err"), attempt=2) is True

    def test_should_not_retry_past_limit(self):
        policy = RetryPolicy(max_retries=3)
        assert policy.should_retry(ValueError("err"), attempt=3) is False

    def test_no_retry_on_excluded_type(self):
        policy = RetryPolicy(max_retries=3, no_retry_on={KeyboardInterrupt})
        assert policy.should_retry(KeyboardInterrupt(), attempt=0) is False

    def test_retry_only_on_specified_types(self):
        policy = RetryPolicy(max_retries=3, retry_on={ConnectionError})
        assert policy.should_retry(ConnectionError(), attempt=0) is True
        assert policy.should_retry(ValueError(), attempt=0) is False

    def test_get_delay_exponential(self):
        policy = RetryPolicy(base_delay=1.0, exponential_base=2.0, max_delay=60)
        assert policy.get_delay(0) == 1.0
        assert policy.get_delay(1) == 2.0
        assert policy.get_delay(2) == 4.0

    def test_get_delay_capped_at_max(self):
        policy = RetryPolicy(base_delay=1.0, exponential_base=2.0, max_delay=10)
        assert policy.get_delay(10) == 10.0


class TestWorker:
    """Tests for the Worker task processing."""

    def test_submit_and_process(self):
        worker = Worker(name="test-worker")
        task = WorkerTask(name="simple", func=lambda: 42)
        worker.submit(task)
        execution = worker.process_next()
        assert execution is not None
        assert execution.success is True
        assert execution.result == 42

    def test_process_empty_queue(self):
        worker = Worker()
        assert worker.process_next() is None

    def test_failed_task_recorded(self):
        worker = Worker(default_retry_policy=RetryPolicy(max_retries=0))
        task = WorkerTask(name="fail", func=lambda: 1 / 0)
        worker.submit(task)
        execution = worker.process_next()
        assert execution is not None
        assert execution.success is False
        assert execution.error is not None

    def test_retry_on_failure(self):
        attempt_count = [0]

        def flaky():
            attempt_count[0] += 1
            if attempt_count[0] < 3:
                raise ValueError("not yet")
            return "ok"

        worker = Worker(default_retry_policy=RetryPolicy(max_retries=5, base_delay=0.01))
        task = WorkerTask(name="flaky", func=flaky)
        worker.submit(task)
        execution = worker.process_next()
        assert execution.success is True
        assert attempt_count[0] == 3

    def test_task_execution_to_dict(self):
        ex = TaskExecution(task_id="t1", attempt=2, success=True, duration=0.5)
        d = ex.to_dict()
        assert d["task_id"] == "t1"
        assert d["attempt"] == 2
        assert d["success"] is True

    def test_worker_task_priority_ordering(self):
        t1 = WorkerTask(name="low", priority=1)
        t2 = WorkerTask(name="high", priority=10)
        assert t2 < t1  # Higher priority number = sorted first
