"""User model.

Captures the minimum information required to authenticate users and
attribute API requests. The schema is opinionated: passwords are
stored as bcrypt/scrypt hashes (see :mod:`app.core.security`), roles
are a simple JSON list, and we include flags for activation and email
verification so the application can implement onboarding flows.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:  # pragma: no cover
    from app.models.api_key import ApiKey
    from app.models.audit_log import AuditLog
    from app.models.conversation import Conversation
    from app.models.document import Document


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A registered user of the gateway."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    password_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    roles: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    preferences: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    api_keys: Mapped[list[ApiKey]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    documents: Mapped[list[Document]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    conversations: Mapped[list[Conversation]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list[AuditLog]] = relationship(
        back_populates="actor", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        Index("ix_users_active_email", "is_active", "email"),
    )

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    @property
    def is_admin(self) -> bool:
        return self.is_superuser or "admin" in (self.roles or ())

    @property
    def display_name(self) -> str:
        return self.full_name or self.email.split("@", 1)[0]

    def has_role(self, role: str) -> bool:
        return self.is_superuser or role in (self.roles or ())
