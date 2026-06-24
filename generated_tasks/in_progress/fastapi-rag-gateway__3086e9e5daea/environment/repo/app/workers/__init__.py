"""Background workers.

Provides a Celery application factory and shared task primitives. When
Celery is unavailable, the helpers degrade to synchronous execution so
unit tests and dev environments can still drive the worker code paths.
"""

from __future__ import annotations

from app.workers.app import celery_app, get_celery_app
from app.workers.executor import enqueue, run_local

__all__ = ["celery_app", "enqueue", "get_celery_app", "run_local"]
