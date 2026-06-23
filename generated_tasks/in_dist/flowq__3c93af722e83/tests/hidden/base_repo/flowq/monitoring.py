"""Metrics and monitoring for FlowQ.

Provides lightweight, in-process counters, gauges, and histograms.
No external dependencies — metrics are read via the dashboard or
exported manually.

Usage::

    from flowq.monitoring import metrics

    metrics.increment("jobs.enqueued")
    metrics.gauge("queue.depth", 42)

    with metrics.timer("job.duration"):
        run_job()
"""

from __future__ import annotations

import statistics
import threading
import time
from collections import defaultdict, deque
from datetime import datetime
from typing import Deque, Dict, Iterator, List, Optional


class Counter:
    """Monotonically increasing integer counter."""

    def __init__(self, name: str, description: str = ""):
        self.name        = name
        self.description = description
        self._value      = 0
        self._lock       = threading.Lock()

    def increment(self, by: int = 1) -> None:
        with self._lock:
            self._value += by

    def reset(self) -> None:
        with self._lock:
            self._value = 0

    @property
    def value(self) -> int:
        with self._lock:
            return self._value

    def __repr__(self) -> str:
        return f"Counter({self.name}={self.value})"


class Gauge:
    """Instantaneous numeric value (can go up or down)."""

    def __init__(self, name: str, description: str = ""):
        self.name        = name
        self.description = description
        self._value      = 0.0
        self._lock       = threading.Lock()

    def set(self, value: float) -> None:
        with self._lock:
            self._value = value

    def increment(self, by: float = 1.0) -> None:
        with self._lock:
            self._value += by

    def decrement(self, by: float = 1.0) -> None:
        with self._lock:
            self._value -= by

    @property
    def value(self) -> float:
        with self._lock:
            return self._value

    def __repr__(self) -> str:
        return f"Gauge({self.name}={self.value})"


class Histogram:
    """Records a distribution of values and computes percentiles."""

    def __init__(self, name: str, description: str = "", max_samples: int = 1000):
        self.name        = name
        self.description = description
        self._samples: Deque[float] = deque(maxlen=max_samples)
        self._lock = threading.Lock()

    def observe(self, value: float) -> None:
        with self._lock:
            self._samples.append(value)

    def percentile(self, p: float) -> Optional[float]:
        with self._lock:
            if not self._samples:
                return None
            sorted_samples = sorted(self._samples)
            idx = int(len(sorted_samples) * p / 100)
            return sorted_samples[min(idx, len(sorted_samples) - 1)]

    @property
    def count(self) -> int:
        with self._lock:
            return len(self._samples)

    @property
    def mean(self) -> Optional[float]:
        with self._lock:
            return statistics.mean(self._samples) if self._samples else None

    @property
    def median(self) -> Optional[float]:
        with self._lock:
            return statistics.median(self._samples) if self._samples else None

    def to_dict(self) -> dict:
        return {
            "count":  self.count,
            "mean":   round(self.mean, 4) if self.mean is not None else None,
            "median": round(self.median, 4) if self.median is not None else None,
            "p95":    round(self.percentile(95), 4) if self.percentile(95) else None,
            "p99":    round(self.percentile(99), 4) if self.percentile(99) else None,
        }

    def __repr__(self) -> str:
        return f"Histogram({self.name}, count={self.count})"


class Timer:
    """Context manager that records elapsed time into a Histogram."""

    def __init__(self, histogram: Histogram):
        self._histogram = histogram
        self._start: Optional[float] = None

    def __enter__(self) -> "Timer":
        self._start = time.perf_counter()
        return self

    def __exit__(self, *_) -> None:
        elapsed = time.perf_counter() - (self._start or 0)
        self._histogram.observe(elapsed)


class MetricsRegistry:
    """Central registry for all FlowQ metrics."""

    def __init__(self):
        self._counters:   Dict[str, Counter]   = {}
        self._gauges:     Dict[str, Gauge]     = {}
        self._histograms: Dict[str, Histogram] = {}
        self._lock = threading.Lock()
        self._started_at = datetime.utcnow()

    # ------------------------------------------------------------------
    # Registration / auto-creation
    # ------------------------------------------------------------------

    def counter(self, name: str, description: str = "") -> Counter:
        with self._lock:
            if name not in self._counters:
                self._counters[name] = Counter(name, description)
            return self._counters[name]

    def gauge(self, name: str, description: str = "") -> Gauge:
        with self._lock:
            if name not in self._gauges:
                self._gauges[name] = Gauge(name, description)
            return self._gauges[name]

    def histogram(self, name: str, description: str = "") -> Histogram:
        with self._lock:
            if name not in self._histograms:
                self._histograms[name] = Histogram(name, description)
            return self._histograms[name]

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    def increment(self, name: str, by: int = 1) -> None:
        self.counter(name).increment(by)

    def set_gauge(self, name: str, value: float) -> None:
        self.gauge(name).set(value)

    def observe(self, name: str, value: float) -> None:
        self.histogram(name).observe(value)

    def timer(self, name: str) -> Timer:
        return Timer(self.histogram(name))

    # ------------------------------------------------------------------
    # Snapshot
    # ------------------------------------------------------------------

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "uptime_seconds": (datetime.utcnow() - self._started_at).total_seconds(),
                "counters":   {k: v.value for k, v in self._counters.items()},
                "gauges":     {k: v.value for k, v in self._gauges.items()},
                "histograms": {k: v.to_dict() for k, v in self._histograms.items()},
            }

    def reset_all(self) -> None:
        with self._lock:
            for c in self._counters.values():
                c.reset()


# Global singleton
metrics = MetricsRegistry()
