"""Persistent rate-limit bucket (used when Redis is unavailable)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class RateLimitBucket(Base, TimestampMixin):
    """Token-bucket state stored in the database for durability."""

    __tablename__ = "rate_limit_buckets"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    rate_per_second: Mapped[float] = mapped_column(Float, nullable=False)
    tokens: Mapped[float] = mapped_column(Float, nullable=False)
    last_refilled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
