"""User-management endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_admin, current_user, db_session, page_params
from app.api.responses import to_envelope
from app.core.pagination import PageRequest
from app.models.user import User
from app.schemas.common import PageEnvelope, StatusResponse
from app.schemas.user import UserOut, UserUpdate
from app.services.users import UserService

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def read_self(user: User = Depends(current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
async def update_self(
    payload: UserUpdate,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> UserOut:
    service = UserService(session)
    updated = await service.update(user.id, payload)
    await session.commit()
    return UserOut.model_validate(updated)


@router.get("/", response_model=PageEnvelope[UserOut])
async def list_users(
    request: PageRequest = Depends(page_params),
    query: str | None = Query(default=None),
    _: User = Depends(current_admin),
    session: AsyncSession = Depends(db_session),
) -> PageEnvelope[UserOut]:
    service = UserService(session)
    page = await service.list(request, query=query)
    items = [UserOut.model_validate(item) for item in page.items]
    return to_envelope(page, items)


@router.get("/{user_id}", response_model=UserOut)
async def read_user(
    user_id: str,
    _: User = Depends(current_admin),
    session: AsyncSession = Depends(db_session),
) -> UserOut:
    service = UserService(session)
    user = await service.get(user_id)
    return UserOut.model_validate(user)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    _: User = Depends(current_admin),
    session: AsyncSession = Depends(db_session),
) -> UserOut:
    service = UserService(session)
    user = await service.update(user_id, payload)
    await session.commit()
    return UserOut.model_validate(user)


@router.delete("/{user_id}", response_model=StatusResponse)
async def deactivate_user(
    user_id: str,
    _: User = Depends(current_admin),
    session: AsyncSession = Depends(db_session),
) -> StatusResponse:
    service = UserService(session)
    await service.deactivate(user_id)
    await session.commit()
    return StatusResponse(status="ok", message="User deactivated")


__all__ = ["router"]
