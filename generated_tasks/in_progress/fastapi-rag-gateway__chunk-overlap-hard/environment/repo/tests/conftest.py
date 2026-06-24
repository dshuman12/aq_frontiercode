"""Shared pytest fixtures."""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SECRET_KEY", "tests-secret-key-please-change")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./.tests.db")
os.environ.setdefault("LLM_PROVIDER", "mock")
os.environ.setdefault("EMBEDDING_PROVIDER", "mock")
os.environ.setdefault("VECTOR_STORE", "memory")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("CACHE_ENABLED", "false")


@pytest.fixture(scope="session")
def event_loop() -> Iterator[asyncio.AbstractEventLoop]:
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def _cleanup_test_db() -> Iterator[None]:
    yield
    db_path = Path(".tests.db")
    if db_path.exists():
        try:
            db_path.unlink()
        except OSError:
            pass


@pytest.fixture()
def settings():
    from app.core.config import get_settings

    get_settings.cache_clear()  # type: ignore[attr-defined]
    yield get_settings()
    get_settings.cache_clear()  # type: ignore[attr-defined]


@pytest.fixture()
async def session() -> AsyncIterator:
    from app.db.init_db import create_all
    from app.db.session import get_session, reset_engine

    reset_engine()
    await create_all()
    async for sess in get_session():
        yield sess


@pytest.fixture()
def app_factory():
    from app.factory import create_app

    return create_app


__all__: list[str] = []
