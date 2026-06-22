from __future__ import annotations

from server.external.db.models.user import User
from server.tests.conftest import (
    get_anon_csrf,
    get_auth_csrf,
    get_refresh_csrf,
    login_user,
    register_user,
)
from server.utils.constants import ResponseMessages


def test_register_success_returns_user_without_tokens(client):
    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "aliceuser",
            "email": "alice@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["message"] == ResponseMessages.USER_REGISTERED_SUCCESS
    user = payload["user"]
    assert user["email"] == "alice@example.com"
    assert user["username"] == "aliceuser"
    assert "password" not in user
    assert not client.cookies.get("access_token_cookie")
    assert not client.cookies.get("refresh_token_cookie")
    assert not client.cookies.get("csrf_access_token")


def test_register_with_username_only_fields(client):
    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "ForgePilot",
            "email": "forgepilot@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["message"] == ResponseMessages.USER_REGISTERED_SUCCESS
    user = payload["user"]
    assert user["username"] == "forgepilot"
    assert user["email"] == "forgepilot@example.com"


def test_register_duplicate_email_returns_conflict(client):
    register_user(client, email="dupe@example.com", password="StrongPass123")
    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "dupeuser",
            "email": "dupe@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 409


def test_login_wrong_password_returns_unauthorized(client):
    register_user(client, email="wrongpass@example.com", password="StrongPass123")
    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "wrongpass@example.com", "password": "wrong"},
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 401


def test_login_with_email_identifier_succeeds(client):
    register_user(client, email="loginok@example.com", password="StrongPass123")
    user = login_user(client, email="loginok@example.com", password="StrongPass123")
    assert user["email"] == "loginok@example.com"
    assert client.cookies.get("access_token_cookie")
    assert client.cookies.get("refresh_token_cookie")


def test_login_with_username_identifier_succeeds(client):
    anon_csrf = get_anon_csrf(client)
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "steelfox",
            "email": "steelfox@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert register_response.status_code == 201

    anon_csrf = get_anon_csrf(client)
    login_response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "steelfox", "password": "StrongPass123"},
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert login_response.status_code == 200
    user = login_response.json()["user"]
    assert user["username"] == "steelfox"
    assert user["email"] == "steelfox@example.com"
    assert client.cookies.get("access_token_cookie")
    assert client.cookies.get("refresh_token_cookie")


def test_login_rate_limit_returns_429(client):
    anon_csrf = get_anon_csrf(client)
    for _ in range(10):
        response = client.post(
            "/api/v1/auth/login",
            json={"identifier": "nobody@example.com", "password": "wrong"},
            headers={"X-CSRF-TOKEN": anon_csrf},
        )
        assert response.status_code == 401

    rate_limited = client.post(
        "/api/v1/auth/login",
        json={"identifier": "nobody@example.com", "password": "wrong"},
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert rate_limited.status_code == 429
    assert rate_limited.json()["detail"] == ResponseMessages.RATE_LIMIT_EXCEEDED
    assert "retry-after" in {k.lower() for k in rate_limited.headers}


def test_register_rate_limit_returns_429(client):
    anon_csrf = get_anon_csrf(client)
    for index in range(5):
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": f"rateuser{index}",
                "email": f"rate-register-{index}@example.com",
                "password": "StrongPass123",
            },
            headers={"X-CSRF-TOKEN": anon_csrf},
        )
        assert response.status_code == 201

    rate_limited = client.post(
        "/api/v1/auth/register",
        json={
            "username": "rateuserx",
            "email": "rate-register-over@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert rate_limited.status_code == 429
    assert rate_limited.json()["detail"] == ResponseMessages.RATE_LIMIT_EXCEEDED
    assert "retry-after" in {k.lower() for k in rate_limited.headers}


def test_username_derivation_uniqueness(client):
    first = register_user(client, email="same.name@example.com", password="StrongPass123")
    second = register_user(client, email="same_name@example.com", password="StrongPass123")
    assert first["username"] != second["username"]
    assert first["username"].replace("_", "").startswith("samename")
    assert second["username"].replace("_", "").startswith("samename")


def test_get_by_id_invalid_returns_none(client):
    assert User.get_by_id("not-an-object-id") is None


def test_me_returns_authenticated_user(client):
    created_user = register_user(client, email="me@example.com", password="StrongPass123")
    login_user(client, email="me@example.com", password="StrongPass123")
    csrf = get_auth_csrf(client)
    response = client.get("/api/v1/auth/me", headers={"X-CSRF-TOKEN": csrf})
    assert response.status_code == 200
    user = response.json()["user"]
    assert user["email"] == created_user["email"]
    assert user["_id"] == created_user["_id"]


def test_update_username_authenticated_user(client):
    anon_csrf = get_anon_csrf(client)
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "orepilot",
            "email": "renameok@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert register_response.status_code == 201

    login_user(client, email="renameok@example.com", password="StrongPass123")
    csrf = get_auth_csrf(client)
    response = client.patch(
        "/api/v1/auth/me/username",
        json={"username": "steelpilot"},
        headers={"X-CSRF-TOKEN": csrf},
    )
    assert response.status_code == 200
    user = response.json()["user"]
    assert user["username"] == "steelpilot"
    assert User.get_by_username("steelpilot") is not None


def test_update_username_conflict_returns_409(client):
    anon_csrf = get_anon_csrf(client)
    first_register = client.post(
        "/api/v1/auth/register",
        json={
            "username": "takenname",
            "email": "taken@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert first_register.status_code == 201

    anon_csrf = get_anon_csrf(client)
    second_register = client.post(
        "/api/v1/auth/register",
        json={
            "username": "freeplayer",
            "email": "free@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert second_register.status_code == 201

    login_user(client, email="free@example.com", password="StrongPass123")
    csrf = get_auth_csrf(client)
    response = client.patch(
        "/api/v1/auth/me/username",
        json={"username": "takenname"},
        headers={"X-CSRF-TOKEN": csrf},
    )
    assert response.status_code == 409


def test_refresh_uses_refresh_csrf(client):
    register_user(client, email="refresh@example.com", password="StrongPass123")
    login_user(client, email="refresh@example.com", password="StrongPass123")
    refresh_csrf = get_refresh_csrf(client)
    response = client.post("/api/v1/auth/refresh", headers={"X-CSRF-TOKEN": refresh_csrf})
    assert response.status_code == 200


def test_logout_uses_access_csrf(client):
    register_user(client, email="logout@example.com", password="StrongPass123")
    login_user(client, email="logout@example.com", password="StrongPass123")
    access_csrf = get_auth_csrf(client)
    response = client.post("/api/v1/auth/logout", headers={"X-CSRF-TOKEN": access_csrf})
    assert response.status_code == 200
    assert not client.cookies.get("access_token_cookie")
    assert not client.cookies.get("refresh_token_cookie")
    assert not client.cookies.get("csrf_access_token")
    assert not client.cookies.get("csrf_refresh_token")


def test_me_rejects_csrf_mismatch(client):
    register_user(client, email="csrfmismatch@example.com", password="StrongPass123")
    login_user(client, email="csrfmismatch@example.com", password="StrongPass123")
    response = client.get("/api/v1/auth/me", headers={"X-CSRF-TOKEN": "bad-token"})
    assert response.status_code == 401
    assert response.json()["detail"] == ResponseMessages.INVALID_OR_EXPIRED_TOKEN


def test_refresh_rejects_wrong_token_type(client):
    register_user(client, email="wrongtype@example.com", password="StrongPass123")
    login_user(client, email="wrongtype@example.com", password="StrongPass123")
    access_token = client.cookies.get("access_token_cookie")
    access_csrf = client.cookies.get("csrf_access_token")
    assert access_token
    assert access_csrf

    client.cookies.set("refresh_token_cookie", access_token)
    client.cookies.set("csrf_refresh_token", access_csrf)

    response = client.post("/api/v1/auth/refresh", headers={"X-CSRF-TOKEN": access_csrf})
    assert response.status_code == 401
    assert response.json()["detail"] == ResponseMessages.INVALID_OR_EXPIRED_TOKEN


def test_me_rejects_malformed_token(client):
    register_user(client, email="badtoken@example.com", password="StrongPass123")
    login_user(client, email="badtoken@example.com", password="StrongPass123")
    csrf = get_auth_csrf(client)
    client.cookies.set("access_token_cookie", "not-a-jwt")
    response = client.get("/api/v1/auth/me", headers={"X-CSRF-TOKEN": csrf})
    assert response.status_code == 401
    assert response.json()["detail"] == ResponseMessages.INVALID_OR_EXPIRED_TOKEN
