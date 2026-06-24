"""HTTP-layer dependencies."""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Depends, Header, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import AuthenticationError
from app.core.pagination import PageRequest
from app.core.security import decode_token
from app.db.session import get_session
from app.models.user import User
from app.repositories.user import UserRepository
from app.services.api_keys import ApiKeyService

bearer_scheme = HTTPBearer(auto_error=False)


async def db_session() -> AsyncIterator[AsyncSession]:
    async for session in get_session():
        yield session


def get_app_settings() -> Settings:
    return get_settings()


def page_params(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    sort: str | None = Query(None),
    direction: str | None = Query(None),
) -> PageRequest:
    return PageRequest(
        page=page,
        size=size,
        sort=sort,
        direction=(direction or "asc").lower(),
    ).normalised()


async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    api_key: str | None = Header(default=None, alias="X-API-Key"),
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> User:
    if api_key:
        try:
            key = await ApiKeyService(session, settings=settings).authenticate(api_key)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
        users = UserRepository(session)
        user = await users.get(key.owner_id)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Owner account is disabled.",
            )
        return user
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token or API key.",
        )
    try:
        token = decode_token(credentials.credentials, expected_type="access", settings=settings)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    users = UserRepository(session)
    user = await users.get(token.sub)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive.",
        )
    return user


async def current_admin(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator role required.",
        )
    return user


async def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    api_key: str | None = Header(default=None, alias="X-API-Key"),
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> User | None:
    if not credentials and not api_key:
        return None
    return await current_user(credentials, api_key, session, settings)


__all__ = [
    "bearer_scheme",
    "current_admin",
    "current_user",
    "db_session",
    "get_app_settings",
    "optional_user",
    "page_params",
]
