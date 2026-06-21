"""
nexusflow.events.bus
~~~~~~~~~~~~~~~~~~~~

Event bus with async dispatch, priority ordering, and middleware
pipeline. Supports both synchronous and asynchronous event handlers
with configurable concurrency.
"""

from __future__ import annotations

import asyncio
import heapq
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import (
    Any,
    Callable,
    Coroutine,
    Dict,
    Generator,
    List,
    Optional,
    Set,
    Tuple,
    Type,
    Union,
)


class EventPriority(Enum):
    """Priority levels for event handlers."""
    CRITICAL = 0
    HIGH = 10
    NORMAL = 50
    LOW = 90
    BACKGROUND = 100


@dataclass
class Event:
    """Base event class."""
    type: str
    payload: Dict[str, Any] = field(default_factory=dict)
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = field(default_factory=time.time)
    source: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    _propagation_stopped: bool = field(default=False, repr=False)

    def stop_propagation(self) -> None:
        """Stop event from being dispatched to further handlers."""
        self._propagation_stopped = True

    @property
    def is_propagation_stopped(self) -> bool:
        return self._propagation_stopped

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "payload": self.payload,
            "timestamp": self.timestamp,
            "source": self.source,
            "metadata": self.metadata,
        }


@dataclass
class HandlerRegistration:
    """Registration info for an event handler."""
    handler: Callable
    event_type: str
    priority: int
    handler_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    is_async: bool = False
    is_once: bool = False
    filter_fn: Optional[Callable[[Event], bool]] = None
    _call_count: int = field(default=0, repr=False)

    def __lt__(self, other: "HandlerRegistration") -> bool:
        return self.priority < other.priority


class EventStats:
    """Tracks event dispatch statistics."""

    def __init__(self) -> None:
        self.events_dispatched: int = 0
        self.handlers_called: int = 0
        self.errors: int = 0
        self.events_by_type: Dict[str, int] = defaultdict(int)
        self.avg_dispatch_time: float = 0.0
        self._total_time: float = 0.0

    def record_dispatch(self, event_type: str, duration: float) -> None:
        self.events_dispatched += 1
        self.events_by_type[event_type] += 1
        self._total_time += duration
        self.avg_dispatch_time = self._total_time / self.events_dispatched

    def record_handler(self) -> None:
        self.handlers_called += 1

    def record_error(self) -> None:
        self.errors += 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "events_dispatched": self.events_dispatched,
            "handlers_called": self.handlers_called,
            "errors": self.errors,
            "avg_dispatch_time_ms": round(self.avg_dispatch_time * 1000, 2),
            "events_by_type": dict(self.events_by_type),
        }


class EventBus:
    """
    Central event bus for publishing and subscribing to events.
    """

    def __init__(self) -> None:
        self._handlers: Dict[str, List[HandlerRegistration]] = defaultdict(list)
        self._wildcard_handlers: List[HandlerRegistration] = []
        self._middleware: List[Callable] = []
        self._stats = EventStats()
        self._event_log: List[Event] = []
        self._max_log_size: int = 10000
        self._error_handler: Optional[Callable[[Event, Exception], None]] = None

    def on(
        self,
        event_type: str,
        handler: Callable,
        priority: int = EventPriority.NORMAL.value,
        once: bool = False,
        filter_fn: Optional[Callable[[Event], bool]] = None,
    ) -> str:
        """Register an event handler."""
        is_async = asyncio.iscoroutinefunction(handler)
        registration = HandlerRegistration(
            handler=handler,
            event_type=event_type,
            priority=priority,
            is_async=is_async,
            is_once=once,
            filter_fn=filter_fn,
        )

        if event_type == "*":
            self._wildcard_handlers.append(registration)
        else:
            self._handlers[event_type].append(registration)

        return registration.handler_id

    def off(self, handler_id: str) -> bool:
        """Unregister an event handler by ID."""
        for event_type, handlers in self._handlers.items():
            for i, reg in enumerate(handlers):
                if reg.handler_id == handler_id:
                    handlers.pop(i)
                    return True
        for i, reg in enumerate(self._wildcard_handlers):
            if reg.handler_id == handler_id:
                self._wildcard_handlers.pop(i)
                return True
        return False

    def once(
        self,
        event_type: str,
        handler: Callable,
        priority: int = EventPriority.NORMAL.value,
    ) -> str:
        """Register a one-time event handler."""
        return self.on(event_type, handler, priority, once=True)

    def use(self, middleware: Callable) -> None:
        """Add event middleware."""
        self._middleware.append(middleware)

    def set_error_handler(self, handler: Callable[[Event, Exception], None]) -> None:
        """Set a global error handler for event processing errors."""
        self._error_handler = handler

    def emit(self, event: Union[Event, str], payload: Optional[Dict[str, Any]] = None) -> None:
        """
        Emit an event synchronously.

        All matching handlers are called in priority order.
        """
        if isinstance(event, str):
            event = Event(type=event, payload=payload or {})

        start = time.time()

        # Apply middleware
        processed_event = self._apply_middleware(event)
        if processed_event is None:
            return

        # Collect and sort handlers
        handlers = self._get_sorted_handlers(processed_event.type)

        heap: List[Tuple[int, int, HandlerRegistration]] = []
        for idx, reg in enumerate(handlers):
            heapq.heappush(heap, (reg.priority, idx, reg))

        to_remove: List[str] = []
        while heap:
            _, _, registration = heapq.heappop(heap)

            if processed_event.is_propagation_stopped:
                break

            if registration.filter_fn and not registration.filter_fn(processed_event):
                continue

            try:
                if registration.is_async:
                    # Run async handler in event loop
                    loop = self._get_or_create_loop()
                    loop.run_until_complete(registration.handler(processed_event))
                else:
                    registration.handler(processed_event)
                registration._call_count += 1
                self._stats.record_handler()
            except Exception as e:
                self._stats.record_error()
                if self._error_handler:
                    self._error_handler(processed_event, e)

            if registration.is_once:
                to_remove.append(registration.handler_id)

        # Remove one-time handlers
        for hid in to_remove:
            self.off(hid)

        duration = time.time() - start
        self._stats.record_dispatch(processed_event.type, duration)
        self._log_event(processed_event)

    async def emit_async(
        self,
        event: Union[Event, str],
        payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Emit an event asynchronously."""
        if isinstance(event, str):
            event = Event(type=event, payload=payload or {})

        start = time.time()
        processed_event = self._apply_middleware(event)
        if processed_event is None:
            return

        handlers = self._get_sorted_handlers(processed_event.type)

        for registration in handlers:
            if processed_event.is_propagation_stopped:
                break
            if registration.filter_fn and not registration.filter_fn(processed_event):
                continue

            try:
                if registration.is_async:
                    await registration.handler(processed_event)
                else:
                    registration.handler(processed_event)
                registration._call_count += 1
                self._stats.record_handler()
            except Exception as e:
                self._stats.record_error()
                if self._error_handler:
                    self._error_handler(processed_event, e)

        duration = time.time() - start
        self._stats.record_dispatch(processed_event.type, duration)
        self._log_event(processed_event)

    def _apply_middleware(self, event: Event) -> Optional[Event]:
        """Apply middleware pipeline to an event."""
        current = event
        for mw in self._middleware:
            result = mw(current)
            if result is None:
                return None
            if isinstance(result, Event):
                current = result
        return current

    def _get_sorted_handlers(self, event_type: str) -> List[HandlerRegistration]:
        """Get all matching handlers sorted by priority."""
        handlers = list(self._handlers.get(event_type, []))
        handlers.extend(self._wildcard_handlers)
        handlers.sort(key=lambda r: r.priority)
        return handlers

    def _get_or_create_loop(self) -> asyncio.AbstractEventLoop:
        """Get or create an event loop."""
        try:
            return asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return loop

    def _log_event(self, event: Event) -> None:
        """Log an event to the event log."""
        self._event_log.append(event)
        if len(self._event_log) > self._max_log_size:
            self._event_log = self._event_log[-self._max_log_size:]

    def get_stats(self) -> Dict[str, Any]:
        """Return event bus statistics."""
        return self._stats.to_dict()

    def get_handler_count(self, event_type: Optional[str] = None) -> int:
        """Return the number of registered handlers."""
        if event_type:
            return len(self._handlers.get(event_type, []))
        total = sum(len(h) for h in self._handlers.values())
        return total + len(self._wildcard_handlers)

    def clear(self) -> None:
        """Remove all handlers and middleware."""
        self._handlers.clear()
        self._wildcard_handlers.clear()
        self._middleware.clear()
        self._event_log.clear()
