"""SQLAlchemy async engine + session factory.

The engine is created lazily on first access so that importing
``app.db`` does not open database connections — important for unit
tests, CLI tools, and short-lived workers that may never touch the
database. The session factory returned by :func:`get_session` is
designed to be used as a FastAPI dependency.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

try:  # pragma: no cover - optional dependency
    from sqlalchemy.ext.asyncio import (
        AsyncEngine,
        AsyncSession,
        async_sessionmaker,
        create_async_engine,
    )
except Exception:  # pragma: no cover - fallback
    AsyncEngine = Any  # type: ignore[assignment]
    AsyncSession = Any  # type: ignore[assignment]

    def create_async_engine(*args: Any, **kwargs: Any) -> Any:  # type: ignore[no-redef]
        raise RuntimeError("SQLAlchemy is not installed")

    def async_sessionmaker(*args: Any, **kwargs: Any) -> Any:  # type: ignore[no-redef]
        raise RuntimeError("SQLAlchemy is not installed")


_logger = get_logger("app.db")

engine: AsyncEngine | None = None
SessionLocal: Any = None


def reset_engine() -> None:
    """Reset the cached engine — used by tests after configuration changes."""

    global engine, SessionLocal
    engine = None
    SessionLocal = None


def _build_engine(settings: Settings) -> AsyncEngine:
    kwargs: dict[str, Any] = {"echo": settings.database_echo, "future": True}
    url = settings.database_url
    if "sqlite" not in url:
        kwargs.update(
            {
                "pool_size": settings.database_pool_size,
                "max_overflow": settings.database_max_overflow,
                "pool_recycle": settings.database_pool_recycle_seconds,
                "pool_pre_ping": True,
            }
        )
    return create_async_engine(url, **kwargs)


def _ensure_engine(settings: Settings | None = None) -> tuple[AsyncEngine, Any]:
    global engine, SessionLocal
    if engine is None or SessionLocal is None:
        settings = settings or get_settings()
        engine = _build_engine(settings)
        SessionLocal = async_sessionmaker(
            bind=engine,
            expire_on_commit=False,
            autoflush=False,
            class_=AsyncSession,
        )
        _logger.info("db.engine.created", extra={"dialect": engine.dialect.name})
    return engine, SessionLocal


async def init_db() -> None:
    """Create tables that aren't yet present.

    For real deployments we use Alembic migrations; this hook exists
    for smoke tests and the SQLite default which doesn't ship with a
    migration step.
    """

    eng, _ = _ensure_engine()
    import app.models  # noqa: F401 — register models with Base
    from app.db.base import Base

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    _logger.info("db.schema.ready")


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency that yields an :class:`AsyncSession`."""

    _, factory = _ensure_engine()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    """Use as ``async with session_scope() as session: ...`` for ad-hoc work."""

    _, factory = _ensure_engine()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def healthcheck() -> bool:
    """Return ``True`` iff the database accepts a trivial query."""

    try:
        async with session_scope() as session:
            await session.execute(_PROBE_STATEMENT)
        return True
    except Exception:  # pragma: no cover - intentional broad capture
        _logger.exception("db.healthcheck.failed")
        return False


try:  # pragma: no cover - optional
    from sqlalchemy import text as _sql_text

    _PROBE_STATEMENT = _sql_text("SELECT 1")
except Exception:  # pragma: no cover
    _PROBE_STATEMENT = "SELECT 1"


__all__ = [
    "engine",
    "SessionLocal",
    "init_db",
    "get_session",
    "session_scope",
    "healthcheck",
    "reset_engine",
]
