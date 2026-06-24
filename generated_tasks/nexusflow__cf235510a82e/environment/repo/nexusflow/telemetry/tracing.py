"""
nexusflow.telemetry.tracing
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Distributed tracing with context propagation, span management,
and trace export. Supports nested spans and cross-service trace
correlation.

BUG CANDIDATE #17: Trace context is lost when crossing a thread
pool boundary. The context is stored in a threading.local() variable
which is not inherited by child threads, so spans created in a
thread pool worker have no parent context.
"""

from __future__ import annotations

import threading
import time
import uuid
from collections import defaultdict
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Generator, List, Optional, Set


@dataclass
class SpanContext:
    """Immutable context identifying a span in a trace."""
    trace_id: str
    span_id: str
    parent_span_id: Optional[str] = None
    baggage: Dict[str, str] = field(default_factory=dict)

    def to_headers(self) -> Dict[str, str]:
        """Serialize to HTTP headers for propagation."""
        headers = {
            "X-Trace-Id": self.trace_id,
            "X-Span-Id": self.span_id,
        }
        if self.parent_span_id:
            headers["X-Parent-Span-Id"] = self.parent_span_id
        for key, value in self.baggage.items():
            headers[f"X-Baggage-{key}"] = value
        return headers

    @classmethod
    def from_headers(cls, headers: Dict[str, str]) -> Optional["SpanContext"]:
        """Deserialize from HTTP headers."""
        trace_id = headers.get("X-Trace-Id")
        span_id = headers.get("X-Span-Id")
        if not trace_id or not span_id:
            return None
        parent = headers.get("X-Parent-Span-Id")
        baggage = {}
        for key, value in headers.items():
            if key.startswith("X-Baggage-"):
                bag_key = key[len("X-Baggage-"):]
                baggage[bag_key] = value
        return cls(trace_id, span_id, parent, baggage)


@dataclass
class Span:
    """Represents a unit of work in a trace."""
    name: str
    context: SpanContext
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    status: str = "ok"
    attributes: Dict[str, Any] = field(default_factory=dict)
    events: List[Dict[str, Any]] = field(default_factory=list)
    links: List[SpanContext] = field(default_factory=list)

    @property
    def duration_ms(self) -> Optional[float]:
        if self.end_time is None:
            return None
        return (self.end_time - self.start_time) * 1000

    def set_attribute(self, key: str, value: Any) -> None:
        self.attributes[key] = value

    def add_event(self, name: str, attributes: Optional[Dict[str, Any]] = None) -> None:
        self.events.append({
            "name": name,
            "timestamp": time.time(),
            "attributes": attributes or {},
        })

    def set_status(self, status: str, message: str = "") -> None:
        self.status = status
        if message:
            self.attributes["status_message"] = message

    def end(self) -> None:
        self.end_time = time.time()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "trace_id": self.context.trace_id,
            "span_id": self.context.span_id,
            "parent_span_id": self.context.parent_span_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration_ms": self.duration_ms,
            "status": self.status,
            "attributes": self.attributes,
            "events": self.events,
        }


# BUG CANDIDATE #17: Thread-local storage for trace context.
# When tasks are submitted to a thread pool, child threads do NOT
# inherit this context, so the parent span information is lost.
_trace_context = threading.local()


class Tracer:
    """
    Creates and manages spans for distributed tracing.

    BUG CANDIDATE #17: Uses threading.local() to store the current
    span context. When work is dispatched to a thread pool executor,
    the worker thread has no access to the parent span context,
    breaking the trace hierarchy.
    """

    def __init__(self, service_name: str = "nexusflow") -> None:
        self.service_name = service_name
        self._completed_spans: List[Span] = []
        self._exporters: List[Callable[[Span], None]] = []
        self._max_spans: int = 10000
        self._lock = threading.Lock()
        self._sampler: Callable[[str], bool] = lambda _: True

    def _get_current_span(self) -> Optional[Span]:
        """Get the current active span from thread-local storage."""
        # BUG: This returns None in thread pool worker threads
        # because threading.local() is per-thread and not inherited
        return getattr(_trace_context, "current_span", None)

    def _set_current_span(self, span: Optional[Span]) -> None:
        """Set the current active span."""
        _trace_context.current_span = span

    def start_span(
        self,
        name: str,
        parent: Optional[SpanContext] = None,
        attributes: Optional[Dict[str, Any]] = None,
        links: Optional[List[SpanContext]] = None,
    ) -> Span:
        """Start a new span."""
        if not self._sampler(name):
            # Create a no-op span
            ctx = SpanContext(trace_id="", span_id="")
            return Span(name=name, context=ctx)

        current = self._get_current_span()

        if parent:
            trace_id = parent.trace_id
            parent_span_id = parent.span_id
        elif current:
            trace_id = current.context.trace_id
            parent_span_id = current.context.span_id
        else:
            trace_id = str(uuid.uuid4())
            parent_span_id = None

        span_id = str(uuid.uuid4())[:16]
        ctx = SpanContext(
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
        )

        span = Span(
            name=name,
            context=ctx,
            attributes=attributes or {},
            links=links or [],
        )
        span.set_attribute("service.name", self.service_name)

        self._set_current_span(span)
        return span

    def end_span(self, span: Span) -> None:
        """End a span and export it."""
        span.end()
        with self._lock:
            self._completed_spans.append(span)
            if len(self._completed_spans) > self._max_spans:
                self._completed_spans = self._completed_spans[-self._max_spans:]

        for exporter in self._exporters:
            try:
                exporter(span)
            except Exception:
                pass

        # Restore parent span as current
        parent_id = span.context.parent_span_id
        if parent_id:
            parent = self._find_span(parent_id)
            self._set_current_span(parent)
        else:
            self._set_current_span(None)

    @contextmanager
    def trace(
        self,
        name: str,
        attributes: Optional[Dict[str, Any]] = None,
    ) -> Generator[Span, None, None]:
        """Context manager for tracing."""
        span = self.start_span(name, attributes=attributes)
        try:
            yield span
        except Exception as e:
            span.set_status("error", str(e))
            raise
        finally:
            self.end_span(span)

    def inject_context(self, span: Span) -> Dict[str, str]:
        """Inject trace context into headers for propagation."""
        return span.context.to_headers()

    def extract_context(self, headers: Dict[str, str]) -> Optional[SpanContext]:
        """Extract trace context from incoming headers."""
        return SpanContext.from_headers(headers)

    def _find_span(self, span_id: str) -> Optional[Span]:
        """Find a span by ID."""
        for span in reversed(self._completed_spans):
            if span.context.span_id == span_id:
                return span
        return None

    def add_exporter(self, exporter: Callable[[Span], None]) -> None:
        self._exporters.append(exporter)

    def set_sampler(self, sampler: Callable[[str], bool]) -> None:
        self._sampler = sampler

    def get_completed_spans(self) -> List[Span]:
        with self._lock:
            return list(self._completed_spans)

    def get_trace(self, trace_id: str) -> List[Span]:
        """Get all spans for a trace."""
        with self._lock:
            return [
                s for s in self._completed_spans
                if s.context.trace_id == trace_id
            ]

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "service": self.service_name,
                "total_spans": len(self._completed_spans),
                "exporters": len(self._exporters),
            }

    def clear(self) -> None:
        with self._lock:
            self._completed_spans.clear()
