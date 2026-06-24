"""Authentication endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import db_session, get_app_settings
from app.core.config import Settings
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserOut
from app.services.auth import AuthService

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=201)
async def register(
    payload: RegisterRequest,
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> UserOut:
    service = AuthService(session, settings=settings)
    user = await service.register(payload)
    await session.commit()
    return UserOut.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> TokenResponse:
    service = AuthService(session, settings=settings)
    ip = request.client.host if request.client else None
    result = await service.login(payload, ip=ip)
    await session.commit()
    return AuthService.to_response(result)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    payload: RefreshRequest,
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> TokenResponse:
    service = AuthService(session, settings=settings)
    result = await service.refresh(payload)
    return AuthService.to_response(result)


__all__ = ["router"]
