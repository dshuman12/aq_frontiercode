from __future__ import annotations

import time

from fastapi import APIRouter, Request, Response, status

from server.config import get_app_config
from server.external.db.mongo import MongoDBClient
from server.utils.logging import get_app_logger

app_logger = get_app_logger()

health_routes = APIRouter(tags=["health"])
_START_TIME_MONOTONIC = time.monotonic()


@health_routes.get("/health")
def health_check(request: Request):
    client_host = request.client.host if request.client else "unknown"
    app_logger.info(f"Health check received from {client_host}")
    return {
        "status": "ok",
        "uptimeSeconds": int(max(0, time.monotonic() - _START_TIME_MONOTONIC)),
    }


@health_routes.get("/ready")
def readiness_check(response: Response):
    checks: dict[str, dict[str, str]] = {}
    ready = True

    try:
        MongoDBClient.get_client().admin.command("ping")
        checks["mongo"] = {"status": "ok"}
    except Exception as exc:
        ready = False
        checks["mongo"] = {"status": "error", "detail": str(exc)}

    cfg = get_app_config()
    checks["env"] = {"status": "ok", "value": "development" if cfg.IS_DEV else "production"}

    if not ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if ready else "not_ready",
        "checks": checks,
        "uptimeSeconds": int(max(0, time.monotonic() - _START_TIME_MONOTONIC)),
    }
