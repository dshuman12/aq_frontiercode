from __future__ import annotations

import os
from typing import Dict, Iterator, Optional

import pytest
from fastapi.testclient import TestClient

from server.config import reset_settings_cache
from server.external.db.mongo import MongoDBClient

# Ensure test-safe defaults exist before importing `server.app`,
# because that module creates a global app at import time.
os.environ["FASTAPI_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-32-bytes-minimum"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-32-bytes-min"

from server.app import create_app


@pytest.fixture(autouse=True)
def _test_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Force test configuration for every test.

    Notes:
    - `get_app_config()` requires `SECRET_KEY` and `JWT_SECRET_KEY` to exist.
    """
    monkeypatch.setenv("FASTAPI_ENV", "testing")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-32-bytes-minimum")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret-key-32-bytes-min")
    monkeypatch.setenv("JWT_COOKIE_SECURE", "false")
    monkeypatch.setenv("AUTH_REQUIRE_EMAIL_VERIFICATION", "false")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-google-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
    monkeypatch.setenv("BACKEND_PUBLIC_BASE_URL", "http://127.0.0.1:5050")
    monkeypatch.setenv("GOOGLE_OAUTH_REDIRECT_PATH", "/api/v1/auth/google/callback")
    monkeypatch.setenv("FRONTEND_PUBLIC_BASE_URL", "http://localhost:5173")
    monkeypatch.setenv("FRONTEND_OAUTH_SUCCESS_PATH", "/lobby")
    monkeypatch.setenv("FRONTEND_OAUTH_FAILURE_PATH", "/?auth_error=oauth")
    monkeypatch.setenv("FRONTEND_OAUTH_LINK_SUCCESS_PATH", "/profile?google_linked=1")
    monkeypatch.setenv("FRONTEND_OAUTH_LINK_FAILURE_PATH", "/profile?google_link_error=1")

    # Keep cookies local in tests.
    monkeypatch.setenv("FASTAPI_RUN_HOST", "127.0.0.1")
    monkeypatch.setenv("FASTAPI_RUN_PORT", "5050")
    reset_settings_cache()


@pytest.fixture()
def client() -> Iterator[TestClient]:
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def _read_cookie(client: TestClient, name: str) -> str:
    return client.cookies.get(name, "")


def get_anon_csrf(client: TestClient) -> str:
    """
    Acquire an anonymous CSRF token and return the value that should be sent
    as `X-CSRF-TOKEN` for anonymous endpoints.
    """
    response = client.get("/api/v1/auth/csrf-token")
    assert response.status_code == 200
    token = response.json().get("csrf_token")
    assert isinstance(token, str) and token
    cookie_val = _read_cookie(client, "anon_csrf")
    assert cookie_val == token
    return token


def get_auth_csrf(client: TestClient) -> str:
    """
    After authentication, `csrf_access_token` is set as a cookie.
    The frontend sends it via `X-CSRF-TOKEN`.
    """
    token = _read_cookie(client, "csrf_access_token")
    assert token
    return token


def get_refresh_csrf(client: TestClient) -> str:
    token = _read_cookie(client, "csrf_refresh_token")
    assert token
    return token


def register_user(
    client: TestClient,
    *,
    email: str,
    password: str,
    username: Optional[str] = None,
) -> Dict:
    anon_csrf = get_anon_csrf(client)
    request_body = {
        "email": email,
        "password": password,
    }
    if username is not None:
        request_body["username"] = username

    response = client.post(
        "/api/v1/auth/register",
        json=request_body,
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    assert "message" in payload
    assert "user" in payload
    return payload["user"]


def login_user(client: TestClient, *, email: str, password: str) -> Dict:
    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": email, "password": password},
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert "user" in payload
    return payload["user"]


@pytest.fixture(autouse=True)
def _reset_mongo_mock(_test_env: None) -> None:
    """
    Ensure each test has a clean in-memory Mongo database when mongomock is used.
    """
    try:
        MongoDBClient.reset_mock()
    except Exception:
        # If the client isn't initialized yet, nothing to reset.
        pass
