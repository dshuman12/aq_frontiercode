"""Tests for flowq.plugins."""

import pytest
from flowq.plugins import PluginManager, Plugin, LoggingPlugin
from flowq.models import Job


@pytest.fixture()
def pm():
    return PluginManager()


@pytest.fixture()
def job():
    return Job(name="test_job", payload={})


class RecordingPlugin:
    name = "recorder"

    def __init__(self):
        self.calls = []

    def on_job_start(self, job):
        self.calls.append(("start", job.name))

    def on_job_success(self, job):
        self.calls.append(("success", job.name))

    def on_job_failure(self, job, exc):
        self.calls.append(("failure", job.name, str(exc)))

    def on_job_retry(self, job, attempt, exc):
        self.calls.append(("retry", job.name, attempt))

    def on_job_cancel(self, job):
        self.calls.append(("cancel", job.name))

    def on_job_enqueue(self, job):
        self.calls.append(("enqueue", job.name))

    def on_startup(self, config):
        self.calls.append(("startup",))

    def on_shutdown(self):
        self.calls.append(("shutdown",))


def test_register_and_fire(pm, job):
    plugin = RecordingPlugin()
    pm.register(plugin)
    pm.on_job_start(job)
    assert ("start", job.name) in plugin.calls


def test_on_job_success(pm, job):
    plugin = RecordingPlugin()
    pm.register(plugin)
    pm.on_job_success(job)
    assert ("success", job.name) in plugin.calls


def test_on_job_failure(pm, job):
    plugin = RecordingPlugin()
    pm.register(plugin)
    pm.on_job_failure(job, RuntimeError("boom"))
    assert any(c[0] == "failure" for c in plugin.calls)


def test_on_job_retry(pm, job):
    plugin = RecordingPlugin()
    pm.register(plugin)
    pm.on_job_retry(job, 2, RuntimeError("x"))
    assert ("retry", job.name, 2) in plugin.calls


def test_on_startup_shutdown(pm, job):
    plugin = RecordingPlugin()
    pm.register(plugin)
    pm.on_startup({})
    pm.on_shutdown()
    assert ("startup",) in plugin.calls
    assert ("shutdown",) in plugin.calls


def test_unregister_by_name(pm, job):
    plugin = RecordingPlugin()
    pm.register(plugin)
    pm.unregister("recorder")
    pm.on_job_start(job)
    assert len(plugin.calls) == 0


def test_plugin_exception_does_not_propagate(pm, job):
    class BrokenPlugin:
        name = "broken"
        def on_job_start(self, job):
            raise RuntimeError("plugin crashed")

    pm.register(BrokenPlugin())
    pm.on_job_start(job)   # should not raise


def test_multiple_plugins_all_called(pm, job):
    p1 = RecordingPlugin()
    p1.name = "p1"
    p2 = RecordingPlugin()
    p2.name = "p2"
    pm.register(p1)
    pm.register(p2)
    pm.on_job_enqueue(job)
    assert ("enqueue", job.name) in p1.calls
    assert ("enqueue", job.name) in p2.calls


def test_names_returns_list(pm):
    pm.register(RecordingPlugin())
    assert "recorder" in pm.names()


def test_clear_removes_all(pm, job):
    pm.register(RecordingPlugin())
    pm.clear()
    assert len(pm) == 0


def test_len(pm):
    pm.register(RecordingPlugin())
    pm.register(RecordingPlugin())
    assert len(pm) == 2
