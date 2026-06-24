"""Prometheus-compatible metrics.

Falls back to a tiny in-process counter implementation when the
``prometheus_client`` package is not installed so that the gateway can
still expose a ``/metrics`` endpoint in dev environments without extra
dependencies. The two backends share the same public API:

* :func:`increment` — increment a counter by ``value``.
* :func:`observe` — record a histogram observation.
* :func:`set_gauge` — assign a gauge value.
* :func:`render_latest` — return the metrics in the text exposition format.
"""

from __future__ import annotations

import threading
import time
from collections.abc import Iterable

try:  # pragma: no cover - optional dependency
    from prometheus_client import CONTENT_TYPE_LATEST as _CONTENT_TYPE
    from prometheus_client import (
        CollectorRegistry,
        Counter,
        Gauge,
        Histogram,
        generate_latest,
    )
except Exception:  # pragma: no cover - fallback path
    CollectorRegistry = None  # type: ignore[misc]
    Counter = Gauge = Histogram = None  # type: ignore[misc]
    generate_latest = None  # type: ignore[assignment]
    _CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8"


CONTENT_TYPE = _CONTENT_TYPE


class _FallbackRegistry:
    """Minimal registry used when prometheus_client is unavailable."""

    def __init__(self) -> None:
        self._counters: dict[str, dict[tuple, float]] = {}
        self._gauges: dict[str, dict[tuple, float]] = {}
        self._histograms: dict[str, dict[tuple, list[float]]] = {}
        self._labels: dict[str, tuple[str, ...]] = {}
        self._help: dict[str, str] = {}
        self._lock = threading.Lock()

    def register(
        self,
        name: str,
        *,
        labels: Iterable[str] = (),
        help: str = "",
        kind: str = "counter",
    ) -> None:
        with self._lock:
            self._labels.setdefault(name, tuple(labels))
            self._help.setdefault(name, help or name)
            if kind == "counter":
                self._counters.setdefault(name, {})
            elif kind == "gauge":
                self._gauges.setdefault(name, {})
            else:
                self._histograms.setdefault(name, {})

    def _label_key(self, name: str, labels: dict[str, str]) -> tuple:
        order = self._labels.get(name, ())
        return tuple(labels.get(label, "") for label in order)

    def inc(self, name: str, labels: dict[str, str], value: float = 1.0) -> None:
        with self._lock:
            store = self._counters.setdefault(name, {})
            key = self._label_key(name, labels)
            store[key] = store.get(key, 0.0) + float(value)

    def set_gauge(self, name: str, labels: dict[str, str], value: float) -> None:
        with self._lock:
            store = self._gauges.setdefault(name, {})
            key = self._label_key(name, labels)
            store[key] = float(value)

    def observe(self, name: str, labels: dict[str, str], value: float) -> None:
        with self._lock:
            store = self._histograms.setdefault(name, {})
            key = self._label_key(name, labels)
            store.setdefault(key, []).append(float(value))

    def render(self) -> bytes:
        lines: list[str] = []
        with self._lock:
            for name, values in self._counters.items():
                lines.append(f"# HELP {name} {self._help.get(name, name)}")
                lines.append(f"# TYPE {name} counter")
                for label_values, value in values.items():
                    lines.append(self._fmt(name, label_values, value))
            for name, values in self._gauges.items():
                lines.append(f"# HELP {name} {self._help.get(name, name)}")
                lines.append(f"# TYPE {name} gauge")
                for label_values, value in values.items():
                    lines.append(self._fmt(name, label_values, value))
            for name, values in self._histograms.items():
                lines.append(f"# HELP {name} {self._help.get(name, name)}")
                lines.append(f"# TYPE {name} summary")
                for label_values, samples in values.items():
                    if not samples:
                        continue
                    total = sum(samples)
                    count = len(samples)
                    lines.append(self._fmt(name + "_sum", label_values, total))
                    lines.append(self._fmt(name + "_count", label_values, count))
        return ("\n".join(lines) + "\n").encode("utf-8")

    def _fmt(self, name: str, label_values: tuple, value: float) -> str:
        labels = self._labels.get(name.split("_")[0], ())
        if not labels or not label_values:
            return f"{name} {value}"
        rendered = ",".join(
            f'{label}="{label_values[i] if i < len(label_values) else ""}"'
            for i, label in enumerate(labels)
        )
        return f"{name}{{{rendered}}} {value}"


_registry_lock = threading.Lock()
_use_prometheus = generate_latest is not None
_fallback_registry = _FallbackRegistry()
_prom_registry = CollectorRegistry() if _use_prometheus else None
_counters: dict[str, object] = {}
_gauges: dict[str, object] = {}
_histograms: dict[str, object] = {}


_DEFINITIONS: list[tuple[str, str, tuple[str, ...]]] = [
    ("rag_http_requests_total", "Total HTTP requests served", ("method", "path", "status")),
    ("rag_http_request_duration_seconds", "HTTP request duration", ("method", "path")),
    ("rag_ingestion_jobs_total", "Total ingestion jobs", ("status",)),
    ("rag_ingestion_duration_seconds", "Ingestion duration", ("status",)),
    ("rag_chat_requests_total", "Chat requests served", ("provider", "model")),
    ("rag_chat_tokens_total", "Tokens consumed by chat requests", ("type",)),
    ("rag_search_requests_total", "Search requests served", ()),
    ("rag_active_users", "Currently authenticated users", ()),
]


def _ensure_metrics() -> None:
    with _registry_lock:
        for name, help_text, labels in _DEFINITIONS:
            if _use_prometheus:
                if name not in _counters and "duration" not in name:
                    _counters[name] = Counter(  # type: ignore[misc]
                        name,
                        help_text,
                        labelnames=labels,
                        registry=_prom_registry,
                    )
                if "duration" in name and name not in _histograms:
                    _histograms[name] = Histogram(  # type: ignore[misc]
                        name,
                        help_text,
                        labelnames=labels,
                        registry=_prom_registry,
                    )
                if "active_users" in name and name not in _gauges:
                    _gauges[name] = Gauge(  # type: ignore[misc]
                        name,
                        help_text,
                        labelnames=labels,
                        registry=_prom_registry,
                    )
            else:
                kind = (
                    "histogram"
                    if "duration" in name
                    else ("gauge" if "active_users" in name else "counter")
                )
                _fallback_registry.register(name, labels=labels, help=help_text, kind=kind)


_ensure_metrics()


def increment(name: str, value: float = 1.0, **labels: str) -> None:
    if _use_prometheus and name in _counters:
        metric = _counters[name]
        if labels:
            metric = metric.labels(**labels)  # type: ignore[union-attr]
        metric.inc(value)  # type: ignore[union-attr]
        return
    _fallback_registry.inc(name, labels, value)


def observe(name: str, value: float, **labels: str) -> None:
    if _use_prometheus and name in _histograms:
        metric = _histograms[name]
        if labels:
            metric = metric.labels(**labels)  # type: ignore[union-attr]
        metric.observe(value)  # type: ignore[union-attr]
        return
    _fallback_registry.observe(name, labels, value)


def set_gauge(name: str, value: float, **labels: str) -> None:
    if _use_prometheus and name in _gauges:
        metric = _gauges[name]
        if labels:
            metric = metric.labels(**labels)  # type: ignore[union-attr]
        metric.set(value)  # type: ignore[union-attr]
        return
    _fallback_registry.set_gauge(name, labels, value)


def render_latest() -> bytes:
    if _use_prometheus and generate_latest is not None and _prom_registry is not None:
        return generate_latest(_prom_registry)
    return _fallback_registry.render()


class Timer:
    """Context manager that records elapsed seconds into a histogram."""

    def __init__(self, metric: str, **labels: str) -> None:
        self.metric = metric
        self.labels = labels
        self._started = 0.0

    def __enter__(self) -> Timer:
        self._started = time.perf_counter()
        return self

    def __exit__(self, *_: object) -> None:
        elapsed = time.perf_counter() - self._started
        observe(self.metric, elapsed, **self.labels)


__all__ = [
    "CONTENT_TYPE",
    "Timer",
    "increment",
    "observe",
    "render_latest",
    "set_gauge",
]
