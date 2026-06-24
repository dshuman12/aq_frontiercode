"""API-key schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseSchema, IdentifiableSchema


class ApiKeyCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=120)
    scopes: list[str] = Field(default_factory=list)
    expires_at: datetime | None = None


class ApiKeyUpdate(BaseSchema):
    name: str | None = Field(default=None, max_length=120)
    is_active: bool | None = None
    scopes: list[str] | None = None
    expires_at: datetime | None = None


class ApiKeyOut(IdentifiableSchema):
    name: str
    prefix: str
    last_four: str
    scopes: list[str] = Field(default_factory=list)
    is_active: bool
    expires_at: datetime | None = None
    last_used_at: datetime | None = None


class ApiKeyCreateResponse(BaseSchema):
    api_key: ApiKeyOut
    plaintext: str = Field(
        description=(
            "The unencrypted API key. Returned exactly once at creation time — "
            "store it securely on the client."
        )
    )


__all__ = [
    "ApiKeyCreate",
    "ApiKeyCreateResponse",
    "ApiKeyOut",
    "ApiKeyUpdate",
]
