"""Acceptance tests for function code versioning.

These exercise the version-tracking behavior of the functions API by calling the
router coroutines directly against an isolated in-memory SQLite database, so no
Clerk auth, Alembic migrations, or HTTP transport are needed. Each test runs on a
fresh database (StaticPool keeps the in-memory connection alive for the run).
"""

import asyncio
import os

# Keep the app's module-level engine off the real clowdy.db file when app.database
# is imported transitively by the routers.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.models import Base
from app.routers import functions as fn_router
from app.schemas import FunctionCreate, FunctionUpdate

USER = "user_test"
OTHER_USER = "user_other"


def _run(scenario):
    """Run an async scenario(db) on a fresh in-memory database."""

    async def _main():
        engine = create_async_engine(
            "sqlite+aiosqlite://",
            poolclass=StaticPool,
            connect_args={"check_same_thread": False},
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        try:
            async with async_sessionmaker(
                engine, class_=AsyncSession, expire_on_commit=False
            )() as session:
                return await scenario(session)
        finally:
            await engine.dispose()

    return asyncio.run(_main())


async def _create(db, name="greeter", code="print('v1')"):
    return await fn_router.create_function(
        FunctionCreate(name=name, code=code), user_id=USER, db=db
    )


def test_create_records_version_one():
    async def scenario(db):
        created = await _create(db, code="print('v1')")
        assert created["active_version"] == 1
        assert created["code"] == "print('v1')"
        versions = await fn_router.list_versions(created["id"], user_id=USER, db=db)
        assert [v.version for v in versions] == [1]
        assert versions[0].code == "print('v1')"

    _run(scenario)


def test_update_code_creates_new_version_and_preserves_old():
    async def scenario(db):
        created = await _create(db, code="print('v1')")
        fid = created["id"]
        updated = await fn_router.update_function(
            fid, FunctionUpdate(code="print('v2')"), user_id=USER, db=db
        )
        # A code change bumps the active version and surfaces the new code.
        assert updated["active_version"] == 2
        assert updated["code"] == "print('v2')"
        # Both versions are retained, newest first, with their original code intact.
        versions = await fn_router.list_versions(fid, user_id=USER, db=db)
        assert [v.version for v in versions] == [2, 1]
        code_by_version = {v.version: v.code for v in versions}
        assert code_by_version[1] == "print('v1')"
        assert code_by_version[2] == "print('v2')"

    _run(scenario)


def test_metadata_only_update_does_not_create_version():
    async def scenario(db):
        created = await _create(db, code="print('v1')")
        fid = created["id"]
        updated = await fn_router.update_function(
            fid, FunctionUpdate(description="now documented"), user_id=USER, db=db
        )
        assert updated["description"] == "now documented"
        assert updated["active_version"] == 1
        versions = await fn_router.list_versions(fid, user_id=USER, db=db)
        assert [v.version for v in versions] == [1]

    _run(scenario)


def test_set_active_version_rolls_back_resolved_code():
    async def scenario(db):
        created = await _create(db, code="print('v1')")
        fid = created["id"]
        await fn_router.update_function(
            fid, FunctionUpdate(code="print('v2')"), user_id=USER, db=db
        )
        rolled = await fn_router.set_active_version(fid, 1, user_id=USER, db=db)
        assert rolled["active_version"] == 1
        assert rolled["code"] == "print('v1')"
        # A subsequent read resolves the rolled-back version's code.
        fetched = await fn_router.get_function(fid, user_id=USER, db=db)
        assert fetched["active_version"] == 1
        assert fetched["code"] == "print('v1')"

    _run(scenario)


def test_set_active_version_unknown_version_raises_404():
    async def scenario(db):
        created = await _create(db)
        with pytest.raises(HTTPException) as exc:
            await fn_router.set_active_version(created["id"], 99, user_id=USER, db=db)
        assert exc.value.status_code == 404

    _run(scenario)


def test_versions_are_scoped_to_owner():
    async def scenario(db):
        created = await _create(db)
        with pytest.raises(HTTPException) as exc:
            await fn_router.list_versions(created["id"], user_id=OTHER_USER, db=db)
        assert exc.value.status_code == 404

    _run(scenario)
