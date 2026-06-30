"""Tests for flowq/monitoring.py — MetricsRegistry."""

import time
import pytest
from flowq.monitoring import MetricsRegistry, Counter, Gauge, Histogram


@pytest.fixture
def reg():
    return MetricsRegistry()


def test_counter_increments(reg):
    reg.increment("hits")
    reg.increment("hits", 4)
    assert reg.counter("hits").value == 5


def test_counter_reset(reg):
    reg.increment("c")
    reg.counter("c").reset()
    assert reg.counter("hits").value == 0


def test_gauge_set_and_read(reg):
    reg.set_gauge("depth", 42.5)
    assert reg.gauge("depth").value == 42.5


def test_gauge_increment_decrement(reg):
    g = reg.gauge("workers")
    g.increment(3)
    g.decrement(1)
    assert g.value == 2.0


def test_histogram_observe(reg):
    for v in (1.0, 2.0, 3.0):
        reg.observe("duration", v)
    h = reg.histogram("duration")
    assert h.count == 3
    assert h.mean == pytest.approx(2.0)


def test_histogram_percentile(reg):
    for v in range(1, 101):
        reg.observe("latency", float(v))
    h = reg.histogram("latency")
    assert h.percentile(50) == pytest.approx(50.0, abs=2)


def test_timer_context_manager(reg):
    with reg.timer("elapsed"):
        time.sleep(0.01)
    assert reg.histogram("elapsed").count == 1
    assert reg.histogram("elapsed").mean > 0


def test_snapshot_structure(reg):
    reg.increment("jobs.done")
    reg.set_gauge("q", 5)
    snap = reg.snapshot()
    assert "counters"   in snap
    assert "gauges"     in snap
    assert "histograms" in snap
    assert "uptime_seconds" in snap


def test_auto_create_on_access(reg):
    # Accessing a non-existent metric should create it
    c = reg.counter("new_counter")
    assert c.value == 0


def test_metrics_are_independent(reg):
    reg.increment("a", 3)
    reg.increment("b", 7)
    assert reg.counter("a").value == 3
    assert reg.counter("b").value == 7
