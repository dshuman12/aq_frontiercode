"""
nexusflow.telemetry.metrics
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Metrics collection framework with counters, gauges, histograms,
and timers. Supports labels, aggregation, and metric export.
"""

from __future__ import annotations

import math
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Tuple


class MetricType(Enum):
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"


@dataclass
class MetricLabel:
    """A set of key-value labels for a metric."""
    labels: Dict[str, str] = field(default_factory=dict)

    @property
    def key(self) -> str:
        sorted_items = sorted(self.labels.items())
        return ",".join(f"{k}={v}" for k, v in sorted_items)


class Counter:
    """A monotonically increasing counter."""

    def __init__(self, name: str, description: str = "") -> None:
        self.name = name
        self.description = description
        self.metric_type = MetricType.COUNTER
        self._values: Dict[str, float] = defaultdict(float)
        self._lock = threading.Lock()

    def inc(self, amount: float = 1.0, labels: Optional[Dict[str, str]] = None) -> None:
        """Increment the counter."""
        if amount < 0:
            raise ValueError("Counter can only be incremented")
        key = MetricLabel(labels or {}).key
        with self._lock:
            self._values[key] += amount

    def get(self, labels: Optional[Dict[str, str]] = None) -> float:
        key = MetricLabel(labels or {}).key
        return self._values.get(key, 0.0)

    def reset(self) -> None:
        with self._lock:
            self._values.clear()

    def collect(self) -> Dict[str, float]:
        with self._lock:
            return dict(self._values)


class Gauge:
    """A value that can go up and down."""

    def __init__(self, name: str, description: str = "") -> None:
        self.name = name
        self.description = description
        self.metric_type = MetricType.GAUGE
        self._values: Dict[str, float] = defaultdict(float)
        self._lock = threading.Lock()

    def set(self, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        key = MetricLabel(labels or {}).key
        with self._lock:
            self._values[key] = value

    def inc(self, amount: float = 1.0, labels: Optional[Dict[str, str]] = None) -> None:
        key = MetricLabel(labels or {}).key
        with self._lock:
            self._values[key] += amount

    def dec(self, amount: float = 1.0, labels: Optional[Dict[str, str]] = None) -> None:
        key = MetricLabel(labels or {}).key
        with self._lock:
            self._values[key] -= amount

    def get(self, labels: Optional[Dict[str, str]] = None) -> float:
        key = MetricLabel(labels or {}).key
        return self._values.get(key, 0.0)

    def collect(self) -> Dict[str, float]:
        with self._lock:
            return dict(self._values)


class Histogram:
    """Records observations in configurable buckets."""

    DEFAULT_BUCKETS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)

    def __init__(
        self,
        name: str,
        description: str = "",
        buckets: Optional[Tuple[float, ...]] = None,
    ) -> None:
        self.name = name
        self.description = description
        self.metric_type = MetricType.HISTOGRAM
        self._buckets = sorted(buckets or self.DEFAULT_BUCKETS)
        self._observations: Dict[str, List[float]] = defaultdict(list)
        self._bucket_counts: Dict[str, Dict[float, int]] = {}
        self._lock = threading.Lock()

    def observe(self, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """Record an observation."""
        key = MetricLabel(labels or {}).key
        with self._lock:
            self._observations[key].append(value)
            if key not in self._bucket_counts:
                self._bucket_counts[key] = {b: 0 for b in self._buckets}
            for bucket in self._buckets:
                if value <= bucket:
                    self._bucket_counts[key][bucket] += 1

    def get_count(self, labels: Optional[Dict[str, str]] = None) -> int:
        key = MetricLabel(labels or {}).key
        return len(self._observations.get(key, []))

    def get_sum(self, labels: Optional[Dict[str, str]] = None) -> float:
        key = MetricLabel(labels or {}).key
        return sum(self._observations.get(key, []))

    def get_mean(self, labels: Optional[Dict[str, str]] = None) -> float:
        key = MetricLabel(labels or {}).key
        obs = self._observations.get(key, [])
        if not obs:
            return 0.0
        return sum(obs) / len(obs)

    def get_percentile(
        self, percentile: float, labels: Optional[Dict[str, str]] = None
    ) -> float:
        """Calculate a percentile from observations."""
        key = MetricLabel(labels or {}).key
        obs = sorted(self._observations.get(key, []))
        if not obs:
            return 0.0
        idx = int(len(obs) * percentile / 100.0)
        idx = min(idx, len(obs) - 1)
        return obs[idx]

    def get_buckets(self, labels: Optional[Dict[str, str]] = None) -> Dict[str, int]:
        key = MetricLabel(labels or {}).key
        counts = self._bucket_counts.get(key, {})
        return {f"le_{b}": c for b, c in sorted(counts.items())}

    def collect(self) -> Dict[str, Any]:
        with self._lock:
            result: Dict[str, Any] = {}
            for key in self._observations:
                obs = self._observations[key]
                result[key] = {
                    "count": len(obs),
                    "sum": sum(obs),
                    "mean": sum(obs) / len(obs) if obs else 0,
                    "buckets": self.get_buckets(None),
                }
            return result


class Timer:
    """Measures duration of operations."""

    def __init__(self, name: str, description: str = "") -> None:
        self.name = name
        self.description = description
        self._histogram = Histogram(f"{name}_seconds", description)

    def time(self, labels: Optional[Dict[str, str]] = None) -> "TimerContext":
        """Context manager to time an operation."""
        return TimerContext(self._histogram, labels)

    def observe(self, duration: float, labels: Optional[Dict[str, str]] = None) -> None:
        self._histogram.observe(duration, labels)

    def collect(self) -> Dict[str, Any]:
        return self._histogram.collect()


class TimerContext:
    """Context manager for timing operations."""

    def __init__(self, histogram: Histogram, labels: Optional[Dict[str, str]] = None) -> None:
        self._histogram = histogram
        self._labels = labels
        self._start: float = 0.0

    def __enter__(self) -> "TimerContext":
        self._start = time.time()
        return self

    def __exit__(self, *args: Any) -> None:
        duration = time.time() - self._start
        self._histogram.observe(duration, self._labels)


class MetricsRegistry:
    """Central registry for all metrics."""

    def __init__(self) -> None:
        self._metrics: Dict[str, Any] = {}
        self._lock = threading.Lock()

    def counter(self, name: str, description: str = "") -> Counter:
        with self._lock:
            if name not in self._metrics:
                self._metrics[name] = Counter(name, description)
            return self._metrics[name]

    def gauge(self, name: str, description: str = "") -> Gauge:
        with self._lock:
            if name not in self._metrics:
                self._metrics[name] = Gauge(name, description)
            return self._metrics[name]

    def histogram(
        self, name: str, description: str = "",
        buckets: Optional[Tuple[float, ...]] = None,
    ) -> Histogram:
        with self._lock:
            if name not in self._metrics:
                self._metrics[name] = Histogram(name, description, buckets)
            return self._metrics[name]

    def timer(self, name: str, description: str = "") -> Timer:
        with self._lock:
            if name not in self._metrics:
                self._metrics[name] = Timer(name, description)
            return self._metrics[name]

    def collect_all(self) -> Dict[str, Any]:
        """Collect all metrics."""
        result: Dict[str, Any] = {}
        for name, metric in self._metrics.items():
            result[name] = {
                "type": metric.metric_type.value if hasattr(metric, "metric_type") else "unknown",
                "values": metric.collect(),
            }
        return result

    def get_metric_names(self) -> List[str]:
        return list(self._metrics.keys())

    def clear(self) -> None:
        with self._lock:
            self._metrics.clear()
