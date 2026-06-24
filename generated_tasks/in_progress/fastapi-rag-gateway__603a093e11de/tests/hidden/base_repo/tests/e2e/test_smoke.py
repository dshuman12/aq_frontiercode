"""High level smoke tests that exercise the full stack."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    from app.factory import create_app

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def test_openapi_schema(client: TestClient) -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    paths = schema.get("paths", {})
    assert "/api/v1/ping" in paths
    assert "/api/v1/health" in paths
    assert any(path.startswith("/api/v1/auth") for path in paths)
    assert any(path.startswith("/api/v1/chat") for path in paths)
