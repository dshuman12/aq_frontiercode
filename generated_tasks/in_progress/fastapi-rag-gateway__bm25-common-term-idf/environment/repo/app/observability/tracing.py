"""OpenTelemetry tracing helpers.

The implementation is intentionally lazy: when the OpenTelemetry SDK is
unavailable, the helpers degrade to no-ops so callers can decorate
functions and start spans without import errors. When the SDK is
present, spans are exported via OTLP/HTTP to the configured endpoint.
"""

from __future__ import annotations

import logging
from collections.abc import Iterator
from contextlib import contextmanager

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

_initialised = False


def init(settings: Settings | None = None) -> bool:
    """Initialise the global tracer provider."""

    global _initialised
    settings = settings or get_settings()
    if not settings.tracing_enabled or _initialised:
        return _initialised
    try:  # pragma: no cover - optional dep
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        resource = Resource.create(
            {
                "service.name": settings.app_name,
                "service.version": settings.app_version,
                "deployment.environment": settings.environment,
            }
        )
        provider = TracerProvider(resource=resource)
        exporter = OTLPSpanExporter(endpoint=str(settings.tracing_endpoint or ""))
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)
        _initialised = True
        logger.info("tracing.initialised", extra={"endpoint": str(settings.tracing_endpoint)})
    except Exception as exc:  # pragma: no cover - optional dep
        logger.warning("tracing.unavailable", extra={"error": str(exc)})
    return _initialised


@contextmanager
def span(name: str, **attributes: object) -> Iterator[None]:
    """Best-effort span context manager.

    Tries OpenTelemetry first, falls back to a noop with debug logging.
    """

    try:  # pragma: no cover - optional dep
        from opentelemetry import trace

        tracer = trace.get_tracer("rag-gateway")
        with tracer.start_as_current_span(name) as current:
            for key, value in attributes.items():
                try:
                    current.set_attribute(key, value)
                except Exception:
                    continue
            yield
            return
    except Exception:
        logger.debug("tracing.span", extra={"name": name, "attributes": attributes})
        yield


__all__ = ["init", "span"]
