"""Tests for flowq/models.py — Job dataclass."""

import pytest
from flowq.models import Job, JobStatus, Priority
from flowq.exceptions import InvalidStatusTransitionError


def test_job_default_status_is_pending():
    job = Job(name="x")
    assert job.status == JobStatus.PENDING


def test_job_default_priority_is_normal():
    job = Job(name="x")
    assert job.priority == Priority.NORMAL


def test_job_id_is_unique():
    ids = {Job(name="x").id for _ in range(50)}
    assert len(ids) == 50


def test_job_repr_contains_name():
    job = Job(name="my_task")
    assert "my_task" in repr(job)



def test_mark_running_sets_status(simple_job):
    simple_job.mark_running()
    assert simple_job.status == JobStatus.RUNNING


def test_mark_running_sets_started_at(simple_job):
    assert simple_job.started_at is None
    simple_job.mark_running()
    assert simple_job.started_at is not None


def test_mark_success_after_running(simple_job):
    simple_job.mark_running()
    simple_job.mark_success("ok")
    assert simple_job.status == JobStatus.SUCCESS
    assert simple_job.result == "ok"


def test_mark_failed_after_running(simple_job):
    simple_job.mark_running()
    simple_job.mark_failed("boom")
    assert simple_job.status == JobStatus.FAILED
    assert simple_job.error == "boom"


def test_invalid_transition_raises(simple_job):
    with pytest.raises(InvalidStatusTransitionError):
        simple_job.mark_success()   # PENDING -> SUCCESS not allowed


def test_terminal_job_cannot_transition(simple_job):
    simple_job.mark_running()
    simple_job.mark_success()
    with pytest.raises(InvalidStatusTransitionError):
        simple_job.mark_running()



def test_retries_remaining_starts_at_max(simple_job):
    assert simple_job.retries_remaining == simple_job.max_retries


def test_retries_remaining_decrements_on_retry(simple_job):
    simple_job.mark_running()
    simple_job.mark_retrying("err")
    assert simple_job.retries_remaining == simple_job.max_retries - 1


def test_is_terminal_false_when_pending(simple_job):
    assert not simple_job.is_terminal


def test_is_terminal_true_after_success(simple_job):
    simple_job.mark_running()
    simple_job.mark_success()
    assert simple_job.is_terminal


def test_is_terminal_true_after_cancel(simple_job):
    simple_job.mark_cancelled()
    assert simple_job.is_terminal


def test_duration_none_before_finish(simple_job):
    simple_job.mark_running()
    assert simple_job.duration is None


def test_duration_positive_after_finish(simple_job):
    simple_job.mark_running()
    simple_job.mark_success()
    assert simple_job.duration >= 0.0



def test_to_dict_contains_id(simple_job):
    d = simple_job.to_dict()
    assert d["id"] == simple_job.id


def test_to_dict_status_is_string(simple_job):
    d = simple_job.to_dict()
    assert isinstance(d["status"], str)


def test_from_dict_round_trip(simple_job):
    restored = Job.from_dict(simple_job.to_dict())
    assert restored.id   == simple_job.id
    assert restored.name == simple_job.name


def test_from_dict_preserves_payload():
    job = Job(name="x", payload={"a": 1, "b": [1, 2]})
    assert Job.from_dict(job.to_dict()).payload == {"a": 1, "b": [1, 2]}


@pytest.mark.parametrize("priority", list(Priority))
def test_priority_round_trips_through_dict(priority):
    job = Job(name="x", priority=priority)
    assert Job.from_dict(job.to_dict()).priority == priority
