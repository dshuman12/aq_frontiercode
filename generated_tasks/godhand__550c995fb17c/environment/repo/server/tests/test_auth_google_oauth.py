from __future__ import annotations

from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient

from server.app import create_app
from server.config import reset_settings_cache
from server.external.db.models.user import User
from server.tests.conftest import get_anon_csrf, get_auth_csrf


class _FakeResponse:
    def __init__(self, payload: dict, status_code: int = 200):
        self._payload = payload
        self.status_code = status_code

    def json(self) -> dict:
        return self._payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


def test_google_login_redirect_sets_state_cookie(client):
    response = client.get("/api/v1/auth/google/login", follow_redirects=False)
    assert response.status_code == 307

    location = response.headers["location"]
    parsed = urlparse(location)
    assert parsed.netloc == "accounts.google.com"
    query = parse_qs(parsed.query)
    assert query.get("client_id", [""])[0] == "test-google-client-id"
    assert query.get("redirect_uri", [""])[0] == "http://127.0.0.1:5050/api/v1/auth/google/callback"
    assert query.get("response_type", [""])[0] == "code"
    state = query.get("state", [""])[0]
    assert state
    assert client.cookies.get("oauth_google_state") == state


def test_google_callback_creates_user_and_sets_session(client, monkeypatch):
    start = client.get("/api/v1/auth/google/login", follow_redirects=False)
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]

    def _fake_post(*_args, **_kwargs):
        return _FakeResponse({"access_token": "google-access-token"})

    def _fake_get(*_args, **_kwargs):
        return _FakeResponse(
            {
                "sub": "google-access-token-sub",
                "email": "google.user@example.com",
                "email_verified": True,
                "given_name": "Google",
                "family_name": "User",
            }
        )

    monkeypatch.setattr("server.api.routers.auth.requests.post", _fake_post)
    monkeypatch.setattr("server.api.routers.auth.requests.get", _fake_get)

    response = client.get(
        "/api/v1/auth/google/callback",
        params={"code": "test-code", "state": state},
        follow_redirects=False,
    )
    assert response.status_code == 307
    assert response.headers["location"] == "http://localhost:5173/lobby"
    assert client.cookies.get("access_token_cookie")
    assert client.cookies.get("refresh_token_cookie")

    user = User.get_by_email("google.user@example.com")
    assert user is not None
    assert user.username.startswith("pilot")
    assert user.username != "googleuser"
    assert user.google_subject == "google-access-token-sub"
    assert user.google_email == "google.user@example.com"


def test_google_callback_existing_email_links_account_and_sets_notice(client, monkeypatch):
    anon_csrf = get_anon_csrf(client)
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "existingpilot",
            "email": "existing@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert register_response.status_code == 201

    start = client.get("/api/v1/auth/google/login", follow_redirects=False)
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]

    def _fake_post(*_args, **_kwargs):
        return _FakeResponse({"access_token": "google-access-token"})

    def _fake_get(*_args, **_kwargs):
        return _FakeResponse(
            {
                "sub": "google-existing-email-subject",
                "email": "existing@example.com",
                "email_verified": True,
            }
        )

    monkeypatch.setattr("server.api.routers.auth.requests.post", _fake_post)
    monkeypatch.setattr("server.api.routers.auth.requests.get", _fake_get)

    response = client.get(
        "/api/v1/auth/google/callback",
        params={"code": "test-code", "state": state},
        follow_redirects=False,
    )
    assert response.status_code == 307
    parsed = urlparse(response.headers["location"])
    query = parse_qs(parsed.query)
    assert parsed.path == "/lobby"
    assert query.get("oauth_notice", [""])[0] == "linked_existing_email"

    user = User.get_by_email("existing@example.com")
    assert user is not None
    assert user.google_subject == "google-existing-email-subject"
    assert user.google_email == "existing@example.com"


def test_google_callback_email_conflict_redirects_with_reason(client, monkeypatch):
    existing_user = User.create(
        username="existingconflict",
        email="existing.conflict@example.com",
        password="hashed-password",
        google_subject="existing-google-subject",
        google_email="existing.conflict@example.com",
    )
    assert existing_user is not None

    start = client.get("/api/v1/auth/google/login", follow_redirects=False)
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]

    def _fake_post(*_args, **_kwargs):
        return _FakeResponse({"access_token": "google-access-token"})

    def _fake_get(*_args, **_kwargs):
        return _FakeResponse(
            {
                "sub": "different-google-subject",
                "email": "existing.conflict@example.com",
                "email_verified": True,
            }
        )

    monkeypatch.setattr("server.api.routers.auth.requests.post", _fake_post)
    monkeypatch.setattr("server.api.routers.auth.requests.get", _fake_get)

    response = client.get(
        "/api/v1/auth/google/callback",
        params={"code": "test-code", "state": state},
        follow_redirects=False,
    )
    assert response.status_code == 307
    parsed = urlparse(response.headers["location"])
    query = parse_qs(parsed.query)
    assert query.get("auth_error", [""])[0] == "oauth"
    assert query.get("oauth_reason", [""])[0] == "email_conflict"


def test_google_login_localhost_redirect_uses_request_port(monkeypatch):
    monkeypatch.setenv("FASTAPI_ENV", "testing")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-32-bytes-minimum")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret-key-32-bytes-min")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-google-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
    # Intentionally mismatched; route should normalize localhost port using request host.
    monkeypatch.setenv("BACKEND_PUBLIC_BASE_URL", "http://localhost:5050")
    monkeypatch.setenv("GOOGLE_OAUTH_REDIRECT_PATH", "/api/v1/auth/google/callback")
    reset_settings_cache()

    with TestClient(create_app(), base_url="http://localhost:5001") as isolated_client:
        response = isolated_client.get("/api/v1/auth/google/login", follow_redirects=False)
        assert response.status_code == 307
        query = parse_qs(urlparse(response.headers["location"]).query)
        assert query.get("redirect_uri", [""])[0] == "http://localhost:5001/api/v1/auth/google/callback"

    reset_settings_cache()


def test_google_link_start_and_callback_links_account(client, monkeypatch):
    anon_csrf = get_anon_csrf(client)
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "profilepilot",
            "email": "profilepilot@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert register_response.status_code == 201

    login_csrf = get_anon_csrf(client)
    login_response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "profilepilot", "password": "StrongPass123"},
        headers={"X-CSRF-TOKEN": login_csrf},
    )
    assert login_response.status_code == 200

    access_csrf = get_auth_csrf(client)
    start_response = client.post(
        "/api/v1/auth/google/link/start",
        headers={"X-CSRF-TOKEN": access_csrf},
    )
    assert start_response.status_code == 200
    location = start_response.json()["url"]
    state = parse_qs(urlparse(location).query)["state"][0]

    def _fake_post(*_args, **_kwargs):
        return _FakeResponse({"access_token": "google-access-token"})

    def _fake_get(*_args, **_kwargs):
        return _FakeResponse(
            {
                "sub": "google-subject-123",
                "email": "profilepilot@example.com",
                "email_verified": True,
                "given_name": "Profile",
                "family_name": "Pilot",
            }
        )

    monkeypatch.setattr("server.api.routers.auth.requests.post", _fake_post)
    monkeypatch.setattr("server.api.routers.auth.requests.get", _fake_get)

    callback_response = client.get(
        "/api/v1/auth/google/callback",
        params={"code": "test-link-code", "state": state},
        follow_redirects=False,
    )
    assert callback_response.status_code == 307
    assert callback_response.headers["location"] == "http://localhost:5173/profile?google_linked=1"

    user = User.get_by_email("profilepilot@example.com")
    assert user is not None
    assert user.google_subject == "google-subject-123"
    assert user.google_email == "profilepilot@example.com"


def test_google_link_callback_conflict_redirects_with_reason(client, monkeypatch):
    # target account initiating link
    anon_csrf = get_anon_csrf(client)
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "targetpilot",
            "email": "targetpilot@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert register_response.status_code == 201
    login_csrf = get_anon_csrf(client)
    login_response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "targetpilot", "password": "StrongPass123"},
        headers={"X-CSRF-TOKEN": login_csrf},
    )
    assert login_response.status_code == 200

    # different account already linked to this google identity
    anon_csrf = get_anon_csrf(client)
    other_register_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "otherpilot",
            "email": "otherpilot@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert other_register_response.status_code == 201
    other_user = User.get_by_email("otherpilot@example.com")
    assert other_user is not None
    other_user.link_google_account("google-subject-conflict", "conflict@example.com")

    access_csrf = get_auth_csrf(client)
    start_response = client.post(
        "/api/v1/auth/google/link/start",
        headers={"X-CSRF-TOKEN": access_csrf},
    )
    assert start_response.status_code == 200
    location = start_response.json()["url"]
    state = parse_qs(urlparse(location).query)["state"][0]

    def _fake_post(*_args, **_kwargs):
        return _FakeResponse({"access_token": "google-access-token"})

    def _fake_get(*_args, **_kwargs):
        return _FakeResponse(
            {
                "sub": "google-subject-conflict",
                "email": "conflict@example.com",
                "email_verified": True,
            }
        )

    monkeypatch.setattr("server.api.routers.auth.requests.post", _fake_post)
    monkeypatch.setattr("server.api.routers.auth.requests.get", _fake_get)

    callback_response = client.get(
        "/api/v1/auth/google/callback",
        params={"code": "test-link-code", "state": state},
        follow_redirects=False,
    )
    assert callback_response.status_code == 307
    parsed = urlparse(callback_response.headers["location"])
    query = parse_qs(parsed.query)
    assert query.get("google_link_error", [""])[0] == "1"
    assert query.get("google_link_reason", [""])[0] == "already_linked"


def test_google_unlink_removes_google_identity(client):
    anon_csrf = get_anon_csrf(client)
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "unlinkpilot",
            "email": "unlinkpilot@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert register_response.status_code == 201
    login_csrf = get_anon_csrf(client)
    login_response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "unlinkpilot", "password": "StrongPass123"},
        headers={"X-CSRF-TOKEN": login_csrf},
    )
    assert login_response.status_code == 200

    user = User.get_by_email("unlinkpilot@example.com")
    assert user is not None
    user.link_google_account("google-subject-unlink", "unlinkpilot@example.com")

    access_csrf = get_auth_csrf(client)
    unlink_response = client.post(
        "/api/v1/auth/google/unlink",
        headers={"X-CSRF-TOKEN": access_csrf},
    )
    assert unlink_response.status_code == 200
    payload = unlink_response.json()["user"]
    assert payload["google_linked"] is False
    assert payload["google_email"] is None

    refreshed = User.get_by_email("unlinkpilot@example.com")
    assert refreshed is not None
    assert refreshed.google_subject is None
    assert refreshed.google_email is None


def test_google_unlink_for_google_created_account_without_password(client, monkeypatch):
    start = client.get("/api/v1/auth/google/login", follow_redirects=False)
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]

    def _fake_post(*_args, **_kwargs):
        return _FakeResponse({"access_token": "google-access-token"})

    def _fake_get(*_args, **_kwargs):
        return _FakeResponse(
            {
                "sub": "google-subject-unlink-no-password",
                "email": "unlink.nopassword@example.com",
                "email_verified": True,
            }
        )

    monkeypatch.setattr("server.api.routers.auth.requests.post", _fake_post)
    monkeypatch.setattr("server.api.routers.auth.requests.get", _fake_get)

    callback_response = client.get(
        "/api/v1/auth/google/callback",
        params={"code": "test-code", "state": state},
        follow_redirects=False,
    )
    assert callback_response.status_code == 307
    assert callback_response.headers["location"] == "http://localhost:5173/lobby"

    access_csrf = get_auth_csrf(client)
    unlink_response = client.post(
        "/api/v1/auth/google/unlink",
        headers={"X-CSRF-TOKEN": access_csrf},
    )
    assert unlink_response.status_code == 200
    payload = unlink_response.json()["user"]
    assert payload["google_linked"] is False
    assert payload["google_email"] is None

    refreshed = User.get_by_email("unlink.nopassword@example.com")
    assert refreshed is not None
    assert refreshed.password is None
    assert refreshed.google_subject is None
    assert refreshed.google_email is None
