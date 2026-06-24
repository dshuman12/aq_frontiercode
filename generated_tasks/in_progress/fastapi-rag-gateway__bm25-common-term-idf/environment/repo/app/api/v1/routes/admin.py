"""Administrative endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_admin, db_session
from app.models.user import User
from app.schemas.common import StatusResponse
from app.services.analytics import AnalyticsService

router = APIRouter()


@router.get("/stats")
async def stats(
    _: User = Depends(current_admin),
    session: AsyncSession = Depends(db_session),
) -> dict:
    service = AnalyticsService(session)
    counts = await service.counts()
    ingestion = await service.ingestion()
    return {
        "counts": counts.__dict__,
        "ingestion": ingestion.__dict__,
    }


@router.post("/reindex", response_model=StatusResponse)
async def reindex(
    _: User = Depends(current_admin),
    session: AsyncSession = Depends(db_session),
) -> StatusResponse:
    return StatusResponse(status="queued", message="Reindex queued (manual operation)")


@router.post("/maintenance/vacuum", response_model=StatusResponse)
async def vacuum(
    _: User = Depends(current_admin),
) -> StatusResponse:
    return StatusResponse(status="ok", message="Vacuum scheduled")


__all__ = ["router"]
