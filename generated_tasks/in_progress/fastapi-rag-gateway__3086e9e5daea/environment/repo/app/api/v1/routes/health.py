"""Health-check endpoints."""

from __future__ import annotations

import time

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import db_session, get_app_settings
from app.core.config import Settings
from app.schemas.common import HealthCheckItem, HealthStatus, StatusResponse

router = APIRouter()


@router.get("/health", response_model=HealthStatus)
async def health(
    settings: Settings = Depends(get_app_settings),
    session: AsyncSession = Depends(db_session),
) -> HealthStatus:
    checks: list[HealthCheckItem] = []
    db_status = "ok"
    db_detail = None
    started = time.monotonic()
    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - environment specific
        db_status = "error"
        db_detail = str(exc)
    db_latency = (time.monotonic() - started) * 1000
    checks.append(
        HealthCheckItem(
            name="database",
            status=db_status,
            latency_ms=db_latency,
            detail=db_detail,
        )
    )
    overall = "ok" if all(check.status == "ok" for check in checks) else "degraded"
    return HealthStatus(
        status=overall,
        version=settings.app_version,
        environment=settings.environment,
        checks=checks,
    )


@router.get("/ping", response_model=StatusResponse)
async def ping() -> StatusResponse:
    return StatusResponse(status="ok", message="pong")


@router.get("/ready", response_model=StatusResponse)
async def ready(session: AsyncSession = Depends(db_session)) -> StatusResponse:
    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:
        return StatusResponse(status="error", message=str(exc))
    return StatusResponse(status="ok")


__all__ = ["router"]
