"""Database bootstrap helpers.

These helpers are intended for local development and smoke tests; in
production we rely on Alembic migrations and an explicit seed script.
"""

from __future__ import annotations

import asyncio

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.security import hash_password
from app.db.session import init_db, session_scope

_logger = get_logger("app.db.init")


async def create_initial_data(settings: Settings | None = None) -> None:
    """Idempotently create the superuser and default workspace."""

    from app.models.user import User

    settings = settings or get_settings()
    if not settings.superuser_email:
        _logger.info("db.init.skip_superuser")
        return

    async with session_scope() as session:
        existing = await session.execute(_select_user_by_email(settings.superuser_email))
        if existing.scalar_one_or_none() is not None:
            _logger.info("db.init.superuser.exists")
            return
        user = User(
            email=settings.superuser_email,
            full_name="Super Admin",
            hashed_password=hash_password(
                settings.secret("superuser_password") or "change-me-now-please"
            ),
            is_active=True,
            is_superuser=True,
            is_verified=True,
            roles=["admin"],
        )
        session.add(user)
        _logger.info("db.init.superuser.created")


def _select_user_by_email(email: str):
    from sqlalchemy import select

    from app.models.user import User

    return select(User).where(User.email == email)


async def main() -> None:
    await init_db()
    await create_initial_data()


async def create_all() -> None:
    """Create every table on the metadata directly (no Alembic)."""

    from app.db.base import Base
    from app.db.session import _ensure_engine

    engine, _ = _ensure_engine()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


async def drop_all() -> None:
    """Drop every table on the metadata directly."""

    from app.db.base import Base
    from app.db.session import _ensure_engine

    engine, _ = _ensure_engine()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)


async def upgrade_to(target: str = "head") -> None:
    """Run Alembic migrations to ``target`` (no-op when Alembic absent)."""

    try:  # pragma: no cover - optional dep
        from alembic import command
        from alembic.config import Config
    except Exception:
        await create_all()
        return
    config = Config("alembic.ini")
    command.upgrade(config, target)


async def downgrade_to(target: str = "base") -> None:
    """Roll back Alembic migrations to ``target``."""

    try:  # pragma: no cover - optional dep
        from alembic import command
        from alembic.config import Config
    except Exception:
        await drop_all()
        return
    config = Config("alembic.ini")
    command.downgrade(config, target)


if __name__ == "__main__":  # pragma: no cover
    asyncio.run(main())


__all__ = [
    "create_all",
    "create_initial_data",
    "downgrade_to",
    "drop_all",
    "main",
    "upgrade_to",
]
