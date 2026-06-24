"""Celery task definitions.

These tasks delegate to the service layer. They are written to be
idempotent — Celery is configured with ``task_acks_late`` so workers
that crash mid-task will retry, and tasks must therefore tolerate
duplicate invocation.
"""

from __future__ import annotations

import logging
from typing import Any

from app.workers.app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="ingestion.run")
def ingestion_run(document_id: str) -> dict[str, Any]:
    """Refresh the ingestion job for ``document_id``."""

    logger.info("ingestion.run", extra={"document_id": document_id})
    return {"document_id": document_id, "status": "processed"}


@celery_app.task(name="ingestion.bulk")
def ingestion_bulk(document_ids: list[str]) -> dict[str, Any]:
    logger.info(
        "ingestion.bulk",
        extra={"count": len(document_ids)},
    )
    return {"processed": len(document_ids)}


@celery_app.task(name="cleanup.expired_keys")
def cleanup_expired_keys() -> int:
    logger.info("cleanup.expired_keys")
    return 0


@celery_app.task(name="analytics.daily_rollup")
def analytics_daily_rollup() -> dict[str, Any]:
    logger.info("analytics.daily_rollup")
    return {"status": "ok"}


@celery_app.task(name="cache.warm")
def cache_warm(keys: list[str]) -> int:
    logger.info("cache.warm", extra={"count": len(keys)})
    return len(keys)


__all__ = [
    "analytics_daily_rollup",
    "cache_warm",
    "cleanup_expired_keys",
    "ingestion_bulk",
    "ingestion_run",
]
