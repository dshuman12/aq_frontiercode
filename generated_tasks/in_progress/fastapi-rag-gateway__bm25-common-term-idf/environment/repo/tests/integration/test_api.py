"""HTTP-level smoke tests for the public API."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    from app.factory import create_app

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def test_root_returns_metadata(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert "name" in body and "version" in body


def test_ping_returns_pong(client: TestClient) -> None:
    response = client.get("/api/v1/ping")
    assert response.status_code == 200
    assert response.json()["message"] == "pong"


def test_health_returns_status(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"ok", "degraded"}


def test_metrics_endpoint(client: TestClient) -> None:
    response = client.get("/api/v1/metrics")
    assert response.status_code in {200, 404}


def test_protected_endpoint_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401
