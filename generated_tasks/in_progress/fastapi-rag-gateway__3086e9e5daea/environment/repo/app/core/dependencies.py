"""FastAPI dependency providers.

Centralising dependency factories here makes them easy to override in
tests via ``app.dependency_overrides`` and keeps the API endpoint
modules small and declarative.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from app.core.config import Settings, get_settings
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.logging import set_user_id
from app.core.pagination import PageRequest
from app.core.security import TokenPayload, decode_token

try:  # pragma: no cover - optional during unit tests
    from fastapi import Depends, Header, HTTPException, Query, Request, status
    from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

    _bearer = HTTPBearer(auto_error=False)
except Exception:  # pragma: no cover - fallback for offline tests
    Depends = lambda x=None: x  # type: ignore[assignment]
    HTTPException = Exception  # type: ignore[assignment]
    Request = object  # type: ignore[assignment]
    Header = lambda *a, **kw: None  # type: ignore[assignment]
    Query = lambda *a, **kw: None  # type: ignore[assignment]
    HTTPAuthorizationCredentials = object  # type: ignore[assignment]
    HTTPBearer = lambda **kw: None  # type: ignore[assignment]
    _bearer = None
    status = type("status", (), {"HTTP_401_UNAUTHORIZED": 401})


def settings_dep() -> Settings:
    return get_settings()


def page_request_dep(
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=200),
    sort: str | None = Query(None),
    direction: str = Query("asc", pattern="^(asc|desc)$"),
) -> PageRequest:
    return PageRequest(page=page, size=size, sort=sort, direction=direction).normalised()


async def db_session_dep() -> AsyncIterator[object]:
    """Yield a database session — populated when SQLAlchemy is wired up."""

    from app.db.session import get_session

    async for session in get_session():
        yield session


async def current_token_dep(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> TokenPayload | None:
    if not credentials:
        return None
    if credentials.scheme.lower() != "bearer":
        raise AuthenticationError("Unsupported auth scheme — use Bearer.")
    return decode_token(credentials.credentials, expected_type="access")


async def current_user_dep(
    request: Request,
    payload: TokenPayload | None = Depends(current_token_dep),
):
    """Resolve the authenticated user (or raise)."""

    from app.services.user_service import UserService

    if payload is None:
        api_key = _extract_api_key(request)
        if api_key:
            user = await UserService.from_request(request).resolve_api_key(api_key)
            if user is None:
                raise AuthenticationError("API key is invalid or revoked.")
            set_user_id(str(user.id))
            request.state.user_id = str(user.id)
            request.state.principal = user
            return user
        raise AuthenticationError("Authentication required.")
    user = await UserService.from_request(request).get_by_id(payload.sub)
    if user is None or not user.is_active:
        raise AuthenticationError("User not found or inactive.")
    set_user_id(str(user.id))
    request.state.user_id = str(user.id)
    request.state.principal = user
    return user


async def optional_user_dep(
    request: Request,
    payload: TokenPayload | None = Depends(current_token_dep),
):
    if payload is None and not _extract_api_key(request):
        return None
    return await current_user_dep(request, payload)  # type: ignore[arg-type]


def require_role(*required_roles: str):
    """Dependency factory that enforces role membership."""

    async def _dependency(user=Depends(current_user_dep)):
        if not getattr(user, "is_superuser", False) and required_roles:
            user_roles = set(getattr(user, "roles", ()) or ())
            if not user_roles.intersection(required_roles):
                raise AuthorizationError(
                    "User does not have any of the required roles: " + ", ".join(required_roles),
                )
        return user

    return _dependency


def _extract_api_key(request: Request) -> str | None:
    api_key = request.headers.get("x-api-key")
    if api_key:
        return api_key.strip()
    auth = request.headers.get("authorization")
    if auth and auth.lower().startswith("api-key "):
        return auth.split(" ", 1)[1].strip()
    return None


__all__ = [
    "settings_dep",
    "page_request_dep",
    "db_session_dep",
    "current_token_dep",
    "current_user_dep",
    "optional_user_dep",
    "require_role",
]
