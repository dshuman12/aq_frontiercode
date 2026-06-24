"""Generic schemas shared by multiple endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class BaseSchema(BaseModel):
    """Base class for all API schemas."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
        validate_assignment=False,
    )


class StatusResponse(BaseSchema):
    """Generic ``status: ok`` response."""

    status: str = Field(default="ok")
    message: str | None = None


class ErrorResponse(BaseSchema):
    """Standard error envelope."""

    code: str
    message: str
    status: int
    details: dict[str, Any] | None = None
    request_id: str | None = None


class HealthCheckItem(BaseSchema):
    name: str
    status: str
    latency_ms: float | None = None
    detail: str | None = None


class HealthStatus(BaseSchema):
    status: str
    version: str
    environment: str
    checks: list[HealthCheckItem] = Field(default_factory=list)


class PageEnvelope(BaseSchema, Generic[T]):
    """Standard pagination envelope used across list endpoints."""

    items: list[T]
    page: int
    size: int
    total: int
    pages: int
    has_next: bool
    has_prev: bool


class TimestampedSchema(BaseSchema):
    created_at: datetime
    updated_at: datetime


class IdentifiableSchema(TimestampedSchema):
    id: str


__all__ = [
    "BaseSchema",
    "ErrorResponse",
    "HealthCheckItem",
    "HealthStatus",
    "IdentifiableSchema",
    "PageEnvelope",
    "StatusResponse",
    "TimestampedSchema",
]
