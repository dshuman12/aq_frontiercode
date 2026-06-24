"""Helpers for dispatching tasks to Celery (or running them locally)."""

from __future__ import annotations

import asyncio
import inspect
from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

from app.core.config import Settings, get_settings
from app.workers.app import get_celery_app

T = TypeVar("T")


def enqueue(name: str, *args: Any, settings: Settings | None = None, **kwargs: Any) -> str:
    """Send a task to Celery, returning the task id."""

    settings = settings or get_settings()
    app = get_celery_app(settings)
    if settings.celery_eager or app is None:
        # Eager mode — execute the task locally and return a deterministic id.
        from app.workers import tasks as task_module

        func = getattr(task_module, name.replace(".", "_"), None)
        if func is None:
            raise ValueError(f"Unknown task {name!r}")
        run_local(func, *args, **kwargs)
        return f"eager::{name}"
    result = app.send_task(name, args=list(args), kwargs=kwargs)
    return getattr(result, "id", f"task::{name}")


def run_local(func: Callable[..., Awaitable[T] | T], *args: Any, **kwargs: Any) -> T:
    """Execute either a coroutine function or a sync callable inline."""

    if inspect.iscoroutinefunction(func):
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
        return loop.run_until_complete(func(*args, **kwargs))
    return func(*args, **kwargs)


__all__ = ["enqueue", "run_local"]
