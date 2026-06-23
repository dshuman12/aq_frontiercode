"""Event system for FlowQ.

Provides a lightweight publish/subscribe mechanism so external code
can hook into job lifecycle events without modifying core logic.

Usage::

    from flowq.events import events

    @events.on("job.success")
    def notify(job):
        print(f"Job {job.id[:8]} finished successfully")
"""

from __future__ import annotations

import logging
import threading
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)

# Built-in event names
JOB_ENQUEUED   = "job.enqueued"
JOB_STARTED    = "job.started"
JOB_SUCCESS    = "job.success"
JOB_FAILED     = "job.failed"
JOB_RETRYING   = "job.retrying"
JOB_CANCELLED  = "job.cancelled"
WORKER_STARTED = "worker.started"
WORKER_STOPPED = "worker.stopped"
QUEUE_FULL     = "queue.full"
DLQ_ADDED      = "dlq.added"


class EventEmitter:
    """Thread-safe event emitter supporting multiple listeners per event."""

    def __init__(self):
        self._listeners: Dict[str, List[Callable]] = {}
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def on(self, event: str) -> Callable:
        """Decorator: register *fn* as a listener for *event*."""
        def decorator(fn: Callable) -> Callable:
            self.subscribe(event, fn)
            return fn
        return decorator

    def subscribe(self, event: str, fn: Callable) -> None:
        with self._lock:
            self._listeners.setdefault(event, []).append(fn)

    def unsubscribe(self, event: str, fn: Callable) -> None:
        with self._lock:
            listeners = self._listeners.get(event, [])
            try:
                listeners.remove(fn)
            except ValueError:
                pass

    def clear(self, event: Optional[str] = None) -> None:
        """Remove all listeners, or only those for *event*."""
        with self._lock:
            if event:
                self._listeners.pop(event, None)
            else:
                self._listeners.clear()

    # ------------------------------------------------------------------
    # Emission
    # ------------------------------------------------------------------

    def emit(self, event: str, *args: Any, **kwargs: Any) -> None:
        """Call all listeners registered for *event* synchronously."""
        with self._lock:
            listeners = list(self._listeners.get(event, []))
        for fn in listeners:
            try:
                fn(*args, **kwargs)
            except Exception as exc:
                logger.warning("Listener %s raised on event %r: %s", fn, event, exc)

    def emit_async(self, event: str, *args: Any, **kwargs: Any) -> None:
        """Emit *event* in a background thread (fire-and-forget)."""
        import threading
        t = threading.Thread(
            target=self.emit, args=(event, *args), kwargs=kwargs, daemon=True
        )
        t.start()

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    def listeners(self, event: str) -> List[Callable]:
        with self._lock:
            return list(self._listeners.get(event, []))

    def event_names(self) -> List[str]:
        with self._lock:
            return list(self._listeners.keys())

    def __repr__(self) -> str:
        with self._lock:
            total = sum(len(v) for v in self._listeners.values())
        return f"EventEmitter(events={len(self._listeners)}, listeners={total})"


# Global singleton — import and use directly
events = EventEmitter()
