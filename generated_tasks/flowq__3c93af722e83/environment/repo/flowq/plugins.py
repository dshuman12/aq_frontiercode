"""
Plugin system for FlowQ.

Plugins are classes that may define hook methods. The PluginManager
calls each registered plugin's hook method (if it exists) at the
appropriate point in the job lifecycle.

Hook methods (all optional):

    on_startup(config)                — called when FlowQ initialises
    on_shutdown()                     — called on graceful shutdown
    on_job_enqueue(job)               — before a job enters the queue
    on_job_start(job)                 — worker picks up a job
    on_job_success(job)               — job finished successfully
    on_job_failure(job, exc)          — job raised an exception
    on_job_retry(job, attempt, exc)   — job will be retried
    on_job_cancel(job)                — job was cancelled

Example::

    class LoggingPlugin:
        name = "logging"

        def on_job_start(self, job):
            print(f"[LOG] starting {job.name}")

        def on_job_failure(self, job, exc):
            print(f"[LOG] failed {job.name}: {exc}")

    plugin_manager.register(LoggingPlugin())
"""

from __future__ import annotations

import logging
import threading
from typing import Any, Optional

from flowq.models import Job

logger = logging.getLogger(__name__)

_HOOKS = [
    "on_startup",
    "on_shutdown",
    "on_job_enqueue",
    "on_job_start",
    "on_job_success",
    "on_job_failure",
    "on_job_retry",
    "on_job_cancel",
]


class Plugin:
    """Optional base class for type-checking; plugins don't need to inherit it."""
    name: str = "unnamed"


class PluginManager:
    """Manages and dispatches lifecycle hooks to registered plugins."""

    def __init__(self) -> None:
        self._plugins: list[Any] = []
        self._lock = threading.Lock()

    # ── registration ─────────────────────────────────────────────────────────

    def register(self, plugin: Any) -> None:
        """Register a plugin instance."""
        with self._lock:
            self._plugins.append(plugin)

    def unregister(self, name: str) -> bool:
        """Remove all plugins whose ``.name`` attribute matches *name*."""
        with self._lock:
            before = len(self._plugins)
            self._plugins = [p for p in self._plugins if getattr(p, "name", None) != name]
            return len(self._plugins) < before

    def clear(self) -> None:
        with self._lock:
            self._plugins.clear()

    def names(self) -> list[str]:
        with self._lock:
            return [getattr(p, "name", repr(p)) for p in self._plugins]

    # ── dispatch ─────────────────────────────────────────────────────────────

    def fire(self, hook: str, *args: Any, **kwargs: Any) -> None:
        """Call *hook* on every plugin that defines it, swallowing exceptions."""
        with self._lock:
            plugins = list(self._plugins)
        for plugin in plugins:
            method = getattr(plugin, hook, None)
            if method is not None:
                try:
                    method(*args, **kwargs)
                except Exception as exc:
                    pname = getattr(plugin, "name", repr(plugin))
                    logger.warning("Plugin %r hook %r raised: %s", pname, hook, exc)

    # ── convenience methods ───────────────────────────────────────────────────

    def on_startup(self, config: Any = None) -> None:
        self.fire("on_startup", config)

    def on_shutdown(self) -> None:
        self.fire("on_shutdown")

    def on_job_enqueue(self, job: Job) -> None:
        self.fire("on_job_enqueue", job)

    def on_job_start(self, job: Job) -> None:
        self.fire("on_job_start", job)

    def on_job_success(self, job: Job) -> None:
        self.fire("on_job_success", job)

    def on_job_failure(self, job: Job, exc: Exception) -> None:
        self.fire("on_job_failure", job, exc)

    def on_job_retry(self, job: Job, attempt: int, exc: Exception) -> None:
        self.fire("on_job_retry", job, attempt, exc)

    def on_job_cancel(self, job: Job) -> None:
        self.fire("on_job_cancel", job)

    def __len__(self) -> int:
        return len(self._plugins)

    def __repr__(self) -> str:
        return f"PluginManager(plugins={self.names()})"


# ── Built-in plugins ─────────────────────────────────────────────────────────

class LoggingPlugin:
    """Ships with FlowQ — logs every job lifecycle event at DEBUG level."""

    name = "flowq.logging"
    _logger = logging.getLogger("flowq.jobs")

    def on_job_enqueue(self, job: Job) -> None:
        self._logger.debug("ENQUEUE %s id=%s", job.name, job.id)

    def on_job_start(self, job: Job) -> None:
        self._logger.debug("START   %s id=%s", job.name, job.id)

    def on_job_success(self, job: Job) -> None:
        self._logger.debug("SUCCESS %s id=%s", job.name, job.id)

    def on_job_failure(self, job: Job, exc: Exception) -> None:
        self._logger.debug("FAILURE %s id=%s err=%s", job.name, job.id, exc)

    def on_job_retry(self, job: Job, attempt: int, exc: Exception) -> None:
        self._logger.debug("RETRY   %s id=%s attempt=%d err=%s", job.name, job.id, attempt, exc)

    def on_job_cancel(self, job: Job) -> None:
        self._logger.debug("CANCEL  %s id=%s", job.name, job.id)


class MetricsPlugin:
    """Increments FlowQ metrics counters on every job event."""

    name = "flowq.metrics"

    def __init__(self) -> None:
        try:
            from flowq.monitoring import metrics as _metrics
            self._metrics = _metrics
        except ImportError:
            self._metrics = None

    def _inc(self, name: str) -> None:
        if self._metrics is not None:
            self._metrics.increment(name)

    def on_job_enqueue(self, job: Job) -> None:
        self._inc("jobs.enqueued")

    def on_job_start(self, job: Job) -> None:
        self._inc("jobs.started")

    def on_job_success(self, job: Job) -> None:
        self._inc("jobs.success")

    def on_job_failure(self, job: Job, exc: Exception) -> None:
        self._inc("jobs.failed")

    def on_job_retry(self, job: Job, attempt: int, exc: Exception) -> None:
        self._inc("jobs.retried")

    def on_job_cancel(self, job: Job) -> None:
        self._inc("jobs.cancelled")


# Global plugin manager, pre-loaded with built-in plugins
plugin_manager = PluginManager()
plugin_manager.register(LoggingPlugin())
plugin_manager.register(MetricsPlugin())
