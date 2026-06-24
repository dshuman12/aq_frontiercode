"""Authentication-related schemas."""

from __future__ import annotations

from pydantic import EmailStr, Field

from app.core.constants import PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH
from app.schemas.common import BaseSchema
from app.schemas.user import UserOut


class RegisterRequest(BaseSchema):
    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    full_name: str | None = Field(default=None, max_length=255)


class LoginRequest(BaseSchema):
    email: EmailStr
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class RefreshRequest(BaseSchema):
    refresh_token: str = Field(min_length=10)


class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int
    scope: list[str] = Field(default_factory=list)
    user: UserOut | None = None


class PasswordResetRequest(BaseSchema):
    email: EmailStr


class PasswordResetConfirm(BaseSchema):
    token: str
    new_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)


__all__ = [
    "LoginRequest",
    "PasswordResetConfirm",
    "PasswordResetRequest",
    "RefreshRequest",
    "RegisterRequest",
    "TokenResponse",
]
