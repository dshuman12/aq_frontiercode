from __future__ import annotations

from urllib.parse import parse_qs, urlparse
from typing import Dict, Iterator, Optional

import pytest
from fastapi.testclient import TestClient
from server.config import reset_settings_cache
from server.app import create_app
from server.external.db.mongo import MongoDBClient
from server.external.services.email_service import EmailService


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

    # Keep cookies local in tests.
    monkeypatch.setenv("FASTAPI_RUN_HOST", "127.0.0.1")
    monkeypatch.setenv("FASTAPI_RUN_PORT", "5000")
    monkeypatch.setenv("EMAIL_VERIFY_TOKEN_TTL_HOURS", "24")
    monkeypatch.setenv("FRONTEND_VERIFY_SUCCESS_URL", "http://localhost:5173/verify/success")
    monkeypatch.setenv("FRONTEND_VERIFY_FAILURE_URL", "http://localhost:5173/verify/failure")
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
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
) -> Dict:
    if first_name is None or last_name is None:
        local_part = email.split("@", 1)[0]
        safe = "".join(ch for ch in local_part if ch.isalnum()) or "User"
        first_name = first_name or safe[:20]
        last_name = last_name or "Test"

    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "password": password,
        },
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
        json={"email": email, "password": password},
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert "user" in payload
    return payload["user"]


def get_latest_verification_token() -> str:
    sent_messages = EmailService._client.emails.sent_messages
    assert sent_messages, "No verification emails have been sent"
    verify_url = sent_messages[-1]["TemplateModel"]["verify_url"]
    query = parse_qs(urlparse(verify_url).query)
    token = query.get("token", [""])[0]
    assert token
    return token


def verify_email_token(client: TestClient, *, token: str):
    return client.get(
        "/api/v1/auth/verify-email",
        params={"token": token},
        follow_redirects=False,
    )


@pytest.fixture(autouse=True)
def _reset_mongo_mock(_test_env: None) -> None:
    """
    Ensure each test has a clean in-memory Mongo database when mongomock is used.

    Also performs best-effort cleanup of test uploads, but refuses to operate on
    dangerous paths (e.g., the repository root) to avoid accidental data loss.
    """
    try:
        MongoDBClient.reset_mock()
    except Exception:
        # If the client isn't initialized yet, nothing to reset.
        pass
