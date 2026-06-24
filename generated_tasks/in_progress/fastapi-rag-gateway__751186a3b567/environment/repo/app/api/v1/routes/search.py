"""Search endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user, db_session, get_app_settings
from app.core.config import Settings
from app.models.user import User
from app.schemas.search import SearchRequest, SearchResponse
from app.services.search import SearchService

router = APIRouter()


@router.post("/", response_model=SearchResponse)
async def search(
    payload: SearchRequest,
    _: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> SearchResponse:
    service = SearchService(session, settings=settings)
    return await service.search(payload)


__all__ = ["router"]
