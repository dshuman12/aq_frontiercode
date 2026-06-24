"""API-key endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user, db_session, get_app_settings, page_params
from app.api.responses import to_envelope
from app.core.config import Settings
from app.core.pagination import PageRequest
from app.models.user import User
from app.schemas.api_key import (
    ApiKeyCreate,
    ApiKeyCreateResponse,
    ApiKeyOut,
    ApiKeyUpdate,
)
from app.schemas.common import PageEnvelope, StatusResponse
from app.services.api_keys import ApiKeyService

router = APIRouter()


@router.get("/", response_model=PageEnvelope[ApiKeyOut])
async def list_api_keys(
    request: PageRequest = Depends(page_params),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> PageEnvelope[ApiKeyOut]:
    service = ApiKeyService(session, settings=settings)
    page = await service.list(user.id, request)
    items = [ApiKeyOut.model_validate(item) for item in page.items]
    return to_envelope(page, items)


@router.post(
    "/",
    response_model=ApiKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_api_key(
    payload: ApiKeyCreate,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> ApiKeyCreateResponse:
    service = ApiKeyService(session, settings=settings)
    key, plaintext = await service.create(user.id, payload)
    await session.commit()
    return ApiKeyCreateResponse(api_key=ApiKeyOut.model_validate(key), plaintext=plaintext)


@router.patch("/{key_id}", response_model=ApiKeyOut)
async def update_api_key(
    key_id: str,
    payload: ApiKeyUpdate,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> ApiKeyOut:
    service = ApiKeyService(session, settings=settings)
    key = await service.update(user.id, key_id, payload)
    await session.commit()
    return ApiKeyOut.model_validate(key)


@router.delete("/{key_id}", response_model=StatusResponse)
async def revoke_api_key(
    key_id: str,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> StatusResponse:
    service = ApiKeyService(session, settings=settings)
    await service.revoke(user.id, key_id)
    await session.commit()
    return StatusResponse(status="ok", message="API key revoked")


__all__ = ["router"]
