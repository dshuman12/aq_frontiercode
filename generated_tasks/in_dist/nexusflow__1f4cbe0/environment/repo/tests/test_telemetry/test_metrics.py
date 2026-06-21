"""Tests for nexusflow.telemetry.metrics."""

import time
import pytest

from nexusflow.telemetry.metrics import (
    Counter,
    Gauge,
    Histogram,
    MetricLabel,
    Timer,
    TimerContext,
)


class TestCounter:
    """Tests for the Counter metric."""

    def test_increment(self):
        c = Counter("requests")
        c.inc()
        assert c.get() == 1.0

    def test_increment_by_amount(self):
        c = Counter("bytes_sent")
        c.inc(500)
        c.inc(300)
        assert c.get() == 800.0

    def test_negative_increment_raises(self):
        c = Counter("requests")
        with pytest.raises(ValueError, match="incremented"):
            c.inc(-1)

    def test_labels(self):
        c = Counter("requests")
        c.inc(labels={"method": "GET"})
        c.inc(labels={"method": "POST"})
        c.inc(labels={"method": "GET"})
        assert c.get(labels={"method": "GET"}) == 2.0
        assert c.get(labels={"method": "POST"}) == 1.0

    def test_reset(self):
        c = Counter("requests")
        c.inc(10)
        c.reset()
        assert c.get() == 0.0

    def test_collect(self):
        c = Counter("requests")
        c.inc(5, labels={"path": "/api"})
        data = c.collect()
        assert len(data) == 1


class TestGauge:
    """Tests for the Gauge metric."""

    def test_set_value(self):
        g = Gauge("temperature")
        g.set(72.5)
        assert g.get() == 72.5

    def test_inc_and_dec(self):
        g = Gauge("active_connections")
        g.inc()
        g.inc()
        g.dec()
        assert g.get() == 1.0

    def test_labels(self):
        g = Gauge("pool_size")
        g.set(10, labels={"pool": "main"})
        g.set(5, labels={"pool": "read"})
        assert g.get(labels={"pool": "main"}) == 10


class TestHistogram:
    """Tests for the Histogram metric."""

    def test_observe(self):
        h = Histogram("response_time")
        h.observe(0.05)
        h.observe(0.15)
        h.observe(1.5)
        assert h.get_count() == 3

    def test_sum(self):
        h = Histogram("duration")
        h.observe(1.0)
        h.observe(2.0)
        assert h.get_sum() == 3.0

    def test_mean(self):
        h = Histogram("latency")
        h.observe(2.0)
        h.observe(4.0)
        assert h.get_mean() == 3.0

    def test_percentile(self):
        h = Histogram("latency")
        for i in range(100):
            h.observe(float(i))
        p50 = h.get_percentile(50)
        assert 45 <= p50 <= 55

    def test_empty_mean_returns_zero(self):
        h = Histogram("empty")
        assert h.get_mean() == 0.0

    def test_bucket_counts(self):
        h = Histogram("latency", buckets=(0.1, 0.5, 1.0))
        h.observe(0.05)
        h.observe(0.3)
        h.observe(0.8)
        h.observe(2.0)
        buckets = h.get_buckets()
        assert buckets["le_0.1"] == 1
        assert buckets["le_0.5"] == 2
        assert buckets["le_1.0"] == 3


class TestTimer:
    """Tests for the Timer metric."""

    def test_context_manager_timing(self):
        timer = Timer("operation")
        with timer.time():
            time.sleep(0.05)
        data = timer.collect()
        assert len(data) > 0

    def test_observe_directly(self):
        timer = Timer("operation")
        timer.observe(0.123)
        data = timer.collect()
        assert len(data) > 0


class TestMetricLabel:
    """Tests for MetricLabel key generation."""

    def test_empty_labels_key(self):
        ml = MetricLabel()
        assert ml.key == ""

    def test_sorted_key(self):
        ml = MetricLabel(labels={"b": "2", "a": "1"})
        assert ml.key == "a=1,b=2"
