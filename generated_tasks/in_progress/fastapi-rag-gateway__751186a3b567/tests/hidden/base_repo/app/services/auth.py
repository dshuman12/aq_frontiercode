"""Authentication service."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserCreate, UserOut
from app.services.users import UserService


@dataclass(slots=True)
class LoginResult:
    user: User
    access_token: str
    refresh_token: str
    expires_in: int


class AuthService:
    """Coordinates registration, login and token refresh."""

    def __init__(self, session: AsyncSession, *, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.users = UserService(session)

    async def register(self, payload: RegisterRequest) -> User:
        return await self.users.create(
            UserCreate(
                email=payload.email,
                password=payload.password,
                full_name=payload.full_name,
            )
        )

    async def login(self, payload: LoginRequest, *, ip: str | None = None) -> LoginResult:
        user = await self.users.get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.hashed_password):
            raise AuthenticationError("Invalid email or password.")
        if not user.is_active:
            raise AuthorizationError("Account is disabled — contact an administrator.")
        await self.users.mark_logged_in(user, ip=ip)
        return self._issue_tokens(user)

    async def refresh(self, payload: RefreshRequest) -> LoginResult:
        token = decode_token(payload.refresh_token, expected_type="refresh", settings=self.settings)
        user = await self.users.must_exist(token.sub)
        if not user.is_active:
            raise AuthorizationError("Account is disabled.")
        return self._issue_tokens(user)

    def _issue_tokens(self, user: User) -> LoginResult:
        scopes = sorted({"user", *user.roles})
        access = create_access_token(
            subject=user.id,
            scopes=scopes,
            settings=self.settings,
        )
        refresh = create_refresh_token(
            subject=user.id,
            settings=self.settings,
        )
        return LoginResult(
            user=user,
            access_token=access,
            refresh_token=refresh,
            expires_in=self.settings.access_token_expire_minutes * 60,
        )

    @staticmethod
    def to_response(result: LoginResult) -> TokenResponse:
        return TokenResponse(
            access_token=result.access_token,
            refresh_token=result.refresh_token,
            expires_in=result.expires_in,
            user=UserOut.model_validate(result.user),
            scope=sorted({"user", *result.user.roles}),
        )

    @staticmethod
    def access_token_expiry() -> timedelta:
        settings = get_settings()
        return timedelta(minutes=settings.access_token_expire_minutes)


__all__ = ["AuthService", "LoginResult"]
