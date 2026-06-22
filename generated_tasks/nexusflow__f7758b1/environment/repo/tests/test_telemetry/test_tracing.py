"""Tests for nexusflow.telemetry.tracing distributed tracing."""

import pytest

from nexusflow.telemetry.tracing import Span, SpanContext, Tracer


class TestSpanContext:
    """Tests for SpanContext serialization."""

    def test_to_headers(self):
        ctx = SpanContext(
            trace_id="trace-123",
            span_id="span-456",
            parent_span_id="span-000",
            baggage={"user_id": "u1"},
        )
        headers = ctx.to_headers()
        assert headers["X-Trace-Id"] == "trace-123"
        assert headers["X-Span-Id"] == "span-456"
        assert headers["X-Parent-Span-Id"] == "span-000"
        assert headers["X-Baggage-user_id"] == "u1"

    def test_from_headers_roundtrip(self):
        original = SpanContext(
            trace_id="t1", span_id="s1", parent_span_id="p1",
            baggage={"key": "val"},
        )
        headers = original.to_headers()
        restored = SpanContext.from_headers(headers)
        assert restored is not None
        assert restored.trace_id == "t1"
        assert restored.span_id == "s1"
        assert restored.parent_span_id == "p1"
        assert restored.baggage["key"] == "val"

    def test_from_headers_missing_returns_none(self):
        assert SpanContext.from_headers({}) is None
        assert SpanContext.from_headers({"X-Trace-Id": "t1"}) is None


class TestSpan:
    """Tests for Span lifecycle."""

    def test_span_creation(self):
        ctx = SpanContext(trace_id="t1", span_id="s1")
        span = Span(name="test-op", context=ctx)
        assert span.name == "test-op"
        assert span.end_time is None

    def test_span_end(self):
        ctx = SpanContext(trace_id="t1", span_id="s1")
        span = Span(name="op", context=ctx)
        span.end()
        assert span.end_time is not None
        assert span.duration_ms is not None
        assert span.duration_ms >= 0

    def test_span_attributes(self):
        ctx = SpanContext(trace_id="t1", span_id="s1")
        span = Span(name="op", context=ctx)
        span.set_attribute("http.method", "GET")
        assert span.attributes["http.method"] == "GET"

    def test_span_events(self):
        ctx = SpanContext(trace_id="t1", span_id="s1")
        span = Span(name="op", context=ctx)
        span.add_event("error", attributes={"message": "timeout"})
        assert len(span.events) == 1
        assert span.events[0]["name"] == "error"

    def test_span_status(self):
        ctx = SpanContext(trace_id="t1", span_id="s1")
        span = Span(name="op", context=ctx)
        span.set_status("error", "Connection refused")
        assert span.status == "error"
        assert span.attributes["status_message"] == "Connection refused"

    def test_span_to_dict(self):
        ctx = SpanContext(trace_id="t1", span_id="s1", parent_span_id="p1")
        span = Span(name="op", context=ctx)
        span.end()
        d = span.to_dict()
        assert d["trace_id"] == "t1"
        assert d["span_id"] == "s1"
        assert d["name"] == "op"
        assert d["duration_ms"] is not None


class TestTracer:
    """Tests for the Tracer."""

    def test_start_span_creates_trace(self):
        tracer = Tracer(service_name="test-svc")
        span = tracer.start_span("request")
        assert span.context.trace_id != ""
        assert span.context.span_id != ""
        assert span.attributes.get("service.name") == "test-svc"

    def test_nested_spans_share_trace_id(self):
        tracer = Tracer()
        parent = tracer.start_span("parent")
        child = tracer.start_span("child")
        assert child.context.trace_id == parent.context.trace_id
        assert child.context.parent_span_id == parent.context.span_id

    def test_explicit_parent_context(self):
        tracer = Tracer()
        parent_ctx = SpanContext(trace_id="ext-t1", span_id="ext-s1")
        span = tracer.start_span("op", parent=parent_ctx)
        assert span.context.trace_id == "ext-t1"
        assert span.context.parent_span_id == "ext-s1"

    def test_end_span_records(self):
        tracer = Tracer()
        span = tracer.start_span("op")
        tracer.end_span(span)
        assert span.end_time is not None
        assert len(tracer._completed_spans) == 1

    def test_exporter_called(self):
        tracer = Tracer()
        exported = []
        tracer._exporters.append(lambda s: exported.append(s.name))
        span = tracer.start_span("export-test")
        tracer.end_span(span)
        assert "export-test" in exported

    def test_sampler_filtering(self):
        tracer = Tracer()
        tracer._sampler = lambda name: name != "noisy"
        span = tracer.start_span("noisy")
        # No-op span with empty trace_id
        assert span.context.trace_id == ""
