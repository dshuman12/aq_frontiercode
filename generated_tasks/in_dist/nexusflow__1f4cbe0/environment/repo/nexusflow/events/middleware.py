"""
nexusflow.events.middleware
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Event middleware pipeline for cross-cutting concerns like logging,
validation, transformation, and rate limiting of events.
"""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional


@dataclass
class MiddlewareContext:
    """Context passed through the middleware pipeline."""
    event: Any
    metadata: Dict[str, Any] = field(default_factory=dict)
    start_time: float = field(default_factory=time.time)
    cancelled: bool = False
    errors: List[str] = field(default_factory=list)

    @property
    def elapsed_ms(self) -> float:
        return (time.time() - self.start_time) * 1000


class EventMiddleware:
    """Base class for event middleware."""

    def __init__(self, name: str = "") -> None:
        self.name = name or type(self).__name__
        self.enabled = True
        self._call_count = 0

    def process(self, ctx: MiddlewareContext, next_fn: Callable) -> Any:
        """Process the event. Call next_fn to continue the pipeline."""
        if not self.enabled:
            return next_fn(ctx)
        self._call_count += 1
        return self._handle(ctx, next_fn)

    def _handle(self, ctx: MiddlewareContext, next_fn: Callable) -> Any:
        """Override in subclasses."""
        return next_fn(ctx)


class LoggingMiddleware(EventMiddleware):
    """Logs all events passing through the pipeline."""

    def __init__(self, logger: Optional[Callable] = None) -> None:
        super().__init__("logging")
        self._logger = logger or print
        self._log: List[Dict[str, Any]] = []

    def _handle(self, ctx: MiddlewareContext, next_fn: Callable) -> Any:
        event = ctx.event
        entry = {
            "event_type": getattr(event, "type", str(event)),
            "timestamp": time.time(),
        }
        self._log.append(entry)
        self._logger(f"[EVENT] {entry['event_type']}")
        result = next_fn(ctx)
        entry["duration_ms"] = ctx.elapsed_ms
        return result

    def get_log(self) -> List[Dict[str, Any]]:
        return list(self._log)


class ValidationMiddleware(EventMiddleware):
    """Validates events against registered schemas."""

    def __init__(self) -> None:
        super().__init__("validation")
        self._schemas: Dict[str, Callable[[Any], List[str]]] = {}

    def register_schema(self, event_type: str, validator: Callable[[Any], List[str]]) -> None:
        """Register a validator for an event type."""
        self._schemas[event_type] = validator

    def _handle(self, ctx: MiddlewareContext, next_fn: Callable) -> Any:
        event = ctx.event
        event_type = getattr(event, "type", "")
        validator = self._schemas.get(event_type)
        if validator:
            errors = validator(event)
            if errors:
                ctx.errors.extend(errors)
                ctx.cancelled = True
                return None
        return next_fn(ctx)


class TransformMiddleware(EventMiddleware):
    """Transforms events before they reach handlers."""

    def __init__(self) -> None:
        super().__init__("transform")
        self._transforms: Dict[str, List[Callable]] = defaultdict(list)

    def add_transform(self, event_type: str, transform: Callable) -> None:
        """Add a transform function for an event type."""
        self._transforms[event_type].append(transform)

    def _handle(self, ctx: MiddlewareContext, next_fn: Callable) -> Any:
        event = ctx.event
        event_type = getattr(event, "type", "")
        for transform in self._transforms.get(event_type, []):
            ctx.event = transform(ctx.event)
        for transform in self._transforms.get("*", []):
            ctx.event = transform(ctx.event)
        return next_fn(ctx)


class RateLimitMiddleware(EventMiddleware):
    """Rate limits events by type."""

    def __init__(
        self,
        max_events: int = 100,
        window_seconds: float = 60.0,
    ) -> None:
        super().__init__("rate_limit")
        self._max_events = max_events
        self._window = window_seconds
        self._counters: Dict[str, List[float]] = defaultdict(list)

    def _handle(self, ctx: MiddlewareContext, next_fn: Callable) -> Any:
        event_type = getattr(ctx.event, "type", "unknown")
        now = time.time()
        cutoff = now - self._window

        # Clean old entries
        self._counters[event_type] = [
            t for t in self._counters[event_type] if t > cutoff
        ]

        if len(self._counters[event_type]) >= self._max_events:
            ctx.cancelled = True
            ctx.errors.append(f"Rate limit exceeded for '{event_type}'")
            return None

        self._counters[event_type].append(now)
        return next_fn(ctx)


class MiddlewarePipeline:
    """Manages an ordered pipeline of event middleware."""

    def __init__(self) -> None:
        self._middleware: List[EventMiddleware] = []
        self._error_handler: Optional[Callable[[MiddlewareContext, Exception], None]] = None

    def add(self, middleware: EventMiddleware) -> None:
        """Add middleware to the pipeline."""
        self._middleware.append(middleware)

    def remove(self, name: str) -> bool:
        """Remove middleware by name."""
        for i, mw in enumerate(self._middleware):
            if mw.name == name:
                self._middleware.pop(i)
                return True
        return False

    def set_error_handler(
        self, handler: Callable[[MiddlewareContext, Exception], None]
    ) -> None:
        self._error_handler = handler

    def execute(self, event: Any) -> Any:
        """Execute the middleware pipeline for an event."""
        ctx = MiddlewareContext(event=event)

        def build_chain(index: int) -> Callable:
            if index >= len(self._middleware):
                return lambda c: c.event

            def next_fn(c: MiddlewareContext) -> Any:
                if c.cancelled:
                    return None
                return self._middleware[index].process(c, build_chain(index + 1))

            return next_fn

        try:
            chain = build_chain(0)
            return chain(ctx)
        except Exception as e:
            if self._error_handler:
                self._error_handler(ctx, e)
                return None
            raise

    def get_middleware_names(self) -> List[str]:
        return [mw.name for mw in self._middleware]

    def get_stats(self) -> Dict[str, Any]:
        return {
            "count": len(self._middleware),
            "middleware": [
                {"name": mw.name, "enabled": mw.enabled, "calls": mw._call_count}
                for mw in self._middleware
            ],
        }
