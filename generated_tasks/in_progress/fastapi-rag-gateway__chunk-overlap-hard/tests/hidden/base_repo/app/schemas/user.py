"""User-related schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import EmailStr, Field, field_validator

from app.core.constants import PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH
from app.schemas.common import BaseSchema, IdentifiableSchema


class UserCreate(BaseSchema):
    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    full_name: str | None = Field(default=None, max_length=255)
    roles: list[str] = Field(default_factory=list)

    @field_validator("roles", mode="before")
    @classmethod
    def _normalise_roles(cls, value: object) -> object:
        if isinstance(value, str):
            return [value]
        return value


class UserUpdate(BaseSchema):
    full_name: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    roles: list[str] | None = None
    preferences: dict | None = None


class UserOut(IdentifiableSchema):
    email: EmailStr
    full_name: str | None = None
    is_active: bool
    is_superuser: bool
    is_verified: bool
    roles: list[str] = Field(default_factory=list)
    preferences: dict = Field(default_factory=dict)
    last_login_at: datetime | None = None


class UserPublic(BaseSchema):
    id: str
    email: EmailStr
    full_name: str | None = None


__all__ = ["UserCreate", "UserOut", "UserUpdate", "UserPublic"]
