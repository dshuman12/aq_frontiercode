"""Tests for flowq.health."""

import pytest
from flowq.health import (
    HealthRegistry, HealthStatus, CheckResult, HealthReport,
)


@pytest.fixture()
def reg():
    return HealthRegistry()


def test_empty_registry_overall_unknown(reg):
    report = reg.run_all()
    assert report.overall == HealthStatus.UNKNOWN


def test_healthy_check(reg):
    reg.register("ok", lambda: {"detail": "fine"})
    result = reg.run("ok")
    assert result.status == HealthStatus.HEALTHY
    assert result.name == "ok"


def test_unhealthy_check(reg):
    def bad():
        raise RuntimeError("db down")
    reg.register("db", bad, critical=True)
    result = reg.run("db")
    assert result.status == HealthStatus.UNHEALTHY
    assert "db down" in result.message


def test_non_critical_check_is_degraded(reg):
    def flaky():
        raise ConnectionError("timeout")
    reg.register("cache", flaky, critical=False)
    result = reg.run("cache")
    assert result.status == HealthStatus.DEGRADED


def test_overall_healthy_all_pass(reg):
    reg.register("a", lambda: None)
    reg.register("b", lambda: {"x": 1})
    report = reg.run_all()
    assert report.overall == HealthStatus.HEALTHY


def test_overall_unhealthy_on_critical_failure(reg):
    reg.register("ok", lambda: None)
    reg.register("bad", lambda: (_ for _ in ()).throw(RuntimeError("boom")), critical=True)
    report = reg.run_all()
    assert report.overall == HealthStatus.UNHEALTHY


def test_overall_degraded_on_non_critical_failure(reg):
    reg.register("ok", lambda: None)
    reg.register("soft", lambda: (_ for _ in ()).throw(RuntimeError("meh")), critical=False)
    report = reg.run_all()
    assert report.overall == HealthStatus.DEGRADED


def test_unknown_check_returns_unknown_result(reg):
    result = reg.run("nonexistent")
    assert result.status == HealthStatus.UNKNOWN


def test_decorator_registers_check(reg):
    @reg.check("my_svc")
    def my_svc_check():
        return {"alive": True}

    assert "my_svc" in reg.names()
    result = reg.run("my_svc")
    assert result.status == HealthStatus.HEALTHY


def test_duration_is_positive(reg):
    import time
    def slow():
        time.sleep(0.01)
    reg.register("slow", slow)
    result = reg.run("slow")
    assert result.duration_ms > 0


def test_to_dict_has_required_keys(reg):
    reg.register("x", lambda: None)
    report = reg.run_all()
    d = report.to_dict()
    assert "overall" in d
    assert "checks" in d
    assert isinstance(d["checks"], list)


def test_unregister_removes_check(reg):
    reg.register("temp", lambda: None)
    reg.unregister("temp")
    assert "temp" not in reg.names()
