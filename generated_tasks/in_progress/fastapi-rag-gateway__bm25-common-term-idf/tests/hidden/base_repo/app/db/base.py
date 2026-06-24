"""Declarative base class and shared mixins for ORM models.

A consistent naming convention is applied so Alembic produces
deterministic migration files and so foreign-key/index/unique
constraints are easy to reference in production tooling. The
:class:`TimestampMixin` and :class:`UUIDPrimaryKeyMixin` mixins capture
patterns that recur across every model.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

try:  # pragma: no cover - optional dependency
    from sqlalchemy import MetaData
    from sqlalchemy.orm import (
        DeclarativeBase,
        Mapped,
        declared_attr,
        mapped_column,
    )
    from sqlalchemy.sql import func
    from sqlalchemy.types import DateTime, String
except Exception:  # pragma: no cover - graceful degradation
    DeclarativeBase = object  # type: ignore[assignment]
    MetaData = dict  # type: ignore[assignment]
    Mapped = Any  # type: ignore[assignment]

    def declared_attr(fn: Any) -> Any:  # type: ignore[no-redef]
        return fn

    def mapped_column(*args: Any, **kwargs: Any) -> Any:  # type: ignore[no-redef]
        return None

    class _FakeFunc:
        def now(self) -> Any:
            return None

    func = _FakeFunc()  # type: ignore[assignment]
    String = str  # type: ignore[assignment]
    DateTime = datetime  # type: ignore[assignment]


naming_convention = {
    "ix": "ix_%(table_name)s_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):  # type: ignore[misc]
    """Project-wide declarative base."""

    metadata = MetaData(naming_convention=naming_convention)  # type: ignore[arg-type]

    type_annotation_map: dict[type, Any] = {}

    @declared_attr.directive
    def __tablename__(cls) -> str:  # type: ignore[override]
        return _camel_to_snake(cls.__name__)

    def to_dict(self) -> dict[str, Any]:
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}

    def __repr__(self) -> str:  # pragma: no cover - cosmetic
        keys = sorted(self.__table__.columns.keys())
        rendered = ", ".join(f"{k}={getattr(self, k)!r}" for k in keys[:4])
        return f"<{type(self).__name__} {rendered}>"


def utcnow() -> datetime:
    return datetime.now(tz=UTC)


class UUIDPrimaryKeyMixin:
    """Adds a 36-char UUID string primary key to a model."""

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )


class TimestampMixin:
    """Adds ``created_at`` / ``updated_at`` columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        server_default=func.now(),
    )


class SoftDeleteMixin:
    """Adds a ``deleted_at`` column for soft-delete semantics."""

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def soft_delete(self) -> None:
        self.deleted_at = utcnow()


def _camel_to_snake(name: str) -> str:
    out: list[str] = []
    for index, char in enumerate(name):
        if char.isupper() and index and not name[index - 1].isupper():
            out.append("_")
        out.append(char.lower())
    return "".join(out)


__all__ = [
    "Base",
    "naming_convention",
    "utcnow",
    "UUIDPrimaryKeyMixin",
    "TimestampMixin",
    "SoftDeleteMixin",
]
