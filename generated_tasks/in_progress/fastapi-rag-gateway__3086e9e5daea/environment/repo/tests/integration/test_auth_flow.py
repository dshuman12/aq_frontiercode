"""Auth flow integration tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path}/auth.db")
    from app.core.config import get_settings
    from app.db.init_db import create_all
    from app.db.session import reset_engine
    from app.factory import create_app

    get_settings.cache_clear()  # type: ignore[attr-defined]
    reset_engine()
    import asyncio

    asyncio.get_event_loop().run_until_complete(create_all())
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def test_register_and_login(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "alice@example.com",
            "password": "S3cret-Password!",
            "full_name": "Alice",
        },
    )
    assert resp.status_code in (200, 201)
    user = resp.json()
    assert user["email"] == "alice@example.com"

    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "alice@example.com", "password": "S3cret-Password!"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body

    headers = {"Authorization": f"Bearer {body['access_token']}"}
    resp = client.get("/api/v1/users/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "alice@example.com"
