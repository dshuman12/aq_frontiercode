"""Celery application factory."""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

_celery_app: Any | None = None


def get_celery_app(settings: Settings | None = None) -> Any:
    """Return a singleton Celery application.

    The function gracefully handles environments without Celery installed
    by returning a lightweight stub object exposing ``send_task``.
    """

    global _celery_app
    if _celery_app is not None:
        return _celery_app
    settings = settings or get_settings()
    try:  # pragma: no cover - optional dep
        from celery import Celery
    except Exception:  # pragma: no cover - optional dep
        logger.info("celery.unavailable")
        _celery_app = _StubCelery()
        return _celery_app
    broker = settings.celery_broker_url or settings.redis_url or "memory://"
    backend = settings.celery_result_backend or settings.redis_url
    app = Celery(
        "rag_gateway",
        broker=broker,
        backend=backend,
        include=["app.workers.tasks"],
    )
    app.conf.update(
        task_default_queue=settings.celery_task_default_queue,
        task_serializer=settings.celery_task_serializer,
        task_acks_late=True,
        worker_prefetch_multiplier=1,
        broker_connection_retry_on_startup=True,
        task_always_eager=settings.celery_eager,
    )
    _celery_app = app
    return _celery_app


class _StubCelery:
    """Tiny stand-in used when Celery is not installed."""

    def __init__(self) -> None:
        self._tasks: dict[str, Any] = {}

    def send_task(self, name: str, args: list[Any] | None = None, **_: Any) -> _StubResult:
        logger.warning("celery.send_stub", extra={"task": name})
        return _StubResult(name)

    def task(self, name: str | None = None, **_: Any):
        def decorator(func):
            registered = name or func.__name__
            self._tasks[registered] = func
            func.delay = lambda *a, **kw: func(*a, **kw)  # type: ignore[attr-defined]
            return func

        return decorator

    @property
    def tasks(self) -> dict[str, Any]:
        return self._tasks


class _StubResult:
    def __init__(self, name: str) -> None:
        self.id = f"local::{name}"

    def get(self, timeout: float | None = None) -> Any:
        return None

    def ready(self) -> bool:  # pragma: no cover
        return True


celery_app = get_celery_app()


__all__ = ["celery_app", "get_celery_app"]
