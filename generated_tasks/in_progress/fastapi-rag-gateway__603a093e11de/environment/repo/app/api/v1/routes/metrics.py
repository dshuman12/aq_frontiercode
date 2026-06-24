"""Prometheus metrics endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from app.api.deps import get_app_settings
from app.core.config import Settings
from app.observability import metrics as metrics_module

router = APIRouter()


@router.get("/metrics", include_in_schema=False)
async def metrics(settings: Settings = Depends(get_app_settings)) -> Response:
    if not settings.metrics_enabled:
        return Response(status_code=404)
    body = metrics_module.render_latest()
    return Response(content=body, media_type=metrics_module.CONTENT_TYPE)


__all__ = ["router"]
