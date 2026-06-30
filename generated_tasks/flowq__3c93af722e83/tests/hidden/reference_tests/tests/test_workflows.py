"""Tests for flowq.workflows."""

import pytest
from flowq.workflows import (
    Workflow, WorkflowRunner, WorkflowStatus,
    WorkflowError, CyclicDependencyError, WorkflowStep,
)
from flowq.models import JobStatus
from flowq.worker import register, Worker
from flowq.storage import Storage
from flowq.queue import JobQueue


def _wf_noop(job):
    pass


def _wf_fail(job):
    raise RuntimeError("step failed")


@pytest.fixture(autouse=True)
def _register_handlers():
    from flowq.worker import _HANDLERS
    _HANDLERS["wf_noop"] = _wf_noop
    _HANDLERS["wf_fail"] = _wf_fail
    yield


@pytest.fixture()
def storage(tmp_path):
    return Storage(str(tmp_path / "wf.db"))


@pytest.fixture()
def worker(storage):
    return Worker(queue=JobQueue(), storage=storage)


@pytest.fixture()
def runner(worker, storage):
    return WorkflowRunner(worker, storage)


def make_wf(name="test_wf"):
    return Workflow(name)


def test_add_step_returns_name():
    wf = make_wf()
    name = wf.add_step("extract", "wf_noop")
    assert name == "extract"


def test_duplicate_step_raises():
    wf = make_wf()
    wf.add_step("s1", "wf_noop")
    with pytest.raises(WorkflowError):
        wf.add_step("s1", "wf_noop")


def test_validate_detects_unknown_dependency():
    wf = make_wf()
    wf.add_step("load", "wf_noop", depends_on=["missing"])
    with pytest.raises(WorkflowError):
        wf.validate()


def test_validate_detects_cycle():
    wf = make_wf()
    wf.add_step("a", "wf_noop", depends_on=["b"])
    wf.add_step("b", "wf_noop", depends_on=["a"])
    with pytest.raises(CyclicDependencyError):
        wf.validate()


def test_topological_order_single_chain():
    wf = make_wf()
    wf.add_step("a", "wf_noop")
    wf.add_step("b", "wf_noop", depends_on=["a"])
    wf.add_step("c", "wf_noop", depends_on=["b"])
    order = wf.topological_order()
    assert order.index("a") < order.index("b")
    assert order.index("b") < order.index("c")


def test_runner_single_step_success(runner):
    wf = make_wf()
    wf.add_step("only", "wf_noop")
    result = runner.run(wf)
    assert result.status == WorkflowStatus.SUCCESS


def test_runner_chain_success(runner):
    wf = make_wf()
    wf.add_step("step1", "wf_noop")
    wf.add_step("step2", "wf_noop", depends_on=["step1"])
    result = runner.run(wf)
    assert result.status == WorkflowStatus.SUCCESS
    assert result.step_results["step1"] == JobStatus.SUCCESS
    assert result.step_results["step2"] == JobStatus.SUCCESS


def test_runner_failure_stops_workflow(runner):
    wf = make_wf()
    wf.add_step("ok", "wf_noop")
    wf.add_step("bad", "wf_fail", depends_on=["ok"])
    result = runner.run(wf)
    assert result.status == WorkflowStatus.FAILED
    assert result.error is not None


def test_workflow_to_dict():
    wf = make_wf("my_wf")
    wf.add_step("s", "wf_noop")
    d = wf.to_dict()
    assert "id" in d
    assert "name" in d
    assert d["name"] == "my_wf"
    assert len(d["steps"]) == 1


def test_result_has_duration(runner):
    wf = make_wf()
    wf.add_step("t", "wf_noop")
    result = runner.run(wf)
    assert result.duration is not None
    assert result.duration >= 0
