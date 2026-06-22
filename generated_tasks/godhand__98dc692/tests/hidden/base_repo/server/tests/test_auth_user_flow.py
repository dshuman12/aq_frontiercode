from __future__ import annotations

from datetime import timedelta

from server.application.user.email_verification import hash_verification_token, utc_now
from server.external.db.models.user import User
from server.external.services.email_service import EmailService
from server.utils.constants import ResponseMessages
from server.tests.conftest import (
    get_anon_csrf,
    get_auth_csrf,
    get_latest_verification_token,
    get_refresh_csrf,
    login_user,
    register_user,
    verify_email_token,
)


def test_register_success_requires_email_verification(client):
    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Alice",
            "last_name": "User",
            "email": "alice@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["message"] == ResponseMessages.VERIFY_EMAIL_REQUIRED
    user = payload["user"]
    assert user["email"] == "alice@example.com"
    assert user["is_verified"] is False
    assert "password" not in user
    assert "email_verification_token_hash" not in user
    assert "email_verification_token_expires_at" not in user
    assert "last_verification_email_sent_at" not in user
    assert not client.cookies.get("access_token_cookie")
    assert not client.cookies.get("refresh_token_cookie")
    assert not client.cookies.get("csrf_access_token")


def test_register_duplicate_email_returns_conflict(client):
    register_user(client, email="dupe@example.com", password="StrongPass123")
    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Dupe",
            "last_name": "User",
            "email": "dupe@example.com",
            "password": "StrongPass123",
        },
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 409


def test_login_unverified_returns_forbidden(client):
    register_user(client, email="loginblock@example.com", password="StrongPass123")
    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "loginblock@example.com", "password": "StrongPass123"},
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == ResponseMessages.EMAIL_NOT_VERIFIED


def test_login_wrong_password_returns_unauthorized(client):
    register_user(client, email="wrongpass@example.com", password="StrongPass123")
    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpass@example.com", "password": "wrong"},
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 401


def test_verify_email_valid_token_marks_verified_and_redirects_success(client):
    register_user(client, email="verifyok@example.com", password="StrongPass123")
    token = get_latest_verification_token()
    response = verify_email_token(client, token=token)
    assert response.status_code == 307
    assert response.headers["location"] == "http://localhost:5173/verify/success"

    user = User.get_by_email("verifyok@example.com")
    assert user is not None
    assert user.is_verified is True
    assert user.email_verification_token_hash is None
    assert user.email_verification_token_expires_at is None


def test_verify_email_expired_token_redirects_failure(client):
    register_user(client, email="expired@example.com", password="StrongPass123")
    token = get_latest_verification_token()
    token_hash = hash_verification_token(token)
    user = User.find_by_verification_token_hash(token_hash)
    assert user is not None
    user.set_email_verification_token(token_hash, utc_now() - timedelta(seconds=1))

    response = verify_email_token(client, token=token)
    assert response.status_code == 307
    assert response.headers["location"] == "http://localhost:5173/verify/failure"

    refreshed = User.get_by_email("expired@example.com")
    assert refreshed is not None
    assert refreshed.is_verified is False
    assert refreshed.email_verification_token_hash is None
    assert refreshed.email_verification_token_expires_at is None


def test_verify_email_invalid_token_redirects_failure(client):
    response = verify_email_token(client, token="invalid-token")
    assert response.status_code == 307
    assert response.headers["location"] == "http://localhost:5173/verify/failure"


def test_login_verified_user_succeeds(client):
    register_user(client, email="loginok@example.com", password="StrongPass123")
    token = get_latest_verification_token()
    verify_email_token(client, token=token)
    user = login_user(client, email="loginok@example.com", password="StrongPass123")
    assert user["email"] == "loginok@example.com"
    assert user["is_verified"] is True
    assert client.cookies.get("access_token_cookie")
    assert client.cookies.get("refresh_token_cookie")


def test_resend_verification_unknown_email_returns_generic_success(client):
    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/resend-verification",
        json={"email": "nouser@example.com"},
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 200
    assert response.json()["message"] == ResponseMessages.VERIFICATION_EMAIL_GENERIC_SENT


def test_resend_verification_verified_user_noops(client):
    register_user(client, email="alreadyverified@example.com", password="StrongPass123")
    token = get_latest_verification_token()
    verify_email_token(client, token=token)
    sent_before = len(EmailService._client.emails.sent_messages)

    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/resend-verification",
        json={"email": "alreadyverified@example.com"},
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 200
    assert response.json()["message"] == ResponseMessages.VERIFICATION_EMAIL_GENERIC_SENT
    sent_after = len(EmailService._client.emails.sent_messages)
    assert sent_after == sent_before


def test_resend_verification_rotates_token_after_cooldown(client):
    register_user(client, email="resendok@example.com", password="StrongPass123")
    first_token = get_latest_verification_token()
    first_hash = hash_verification_token(first_token)
    user = User.get_by_email("resendok@example.com")
    assert user is not None
    first_sent_at = user.last_verification_email_sent_at
    user.set_last_verification_email_sent_at(utc_now() - timedelta(seconds=61))
    sent_before = len(EmailService._client.emails.sent_messages)

    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/resend-verification",
        json={"email": "resendok@example.com"},
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 200
    assert response.json()["message"] == ResponseMessages.VERIFICATION_EMAIL_GENERIC_SENT

    second_token = get_latest_verification_token()
    second_hash = hash_verification_token(second_token)
    assert second_token != first_token
    assert second_hash != first_hash

    refreshed = User.get_by_email("resendok@example.com")
    assert refreshed is not None
    assert refreshed.email_verification_token_hash == second_hash
    assert refreshed.last_verification_email_sent_at is not None
    if first_sent_at is not None:
        assert refreshed.last_verification_email_sent_at > first_sent_at
    sent_after = len(EmailService._client.emails.sent_messages)
    assert sent_after == sent_before + 1


def test_resend_verification_within_cooldown_noops(client):
    register_user(client, email="resendcooldown@example.com", password="StrongPass123")
    first_token = get_latest_verification_token()
    sent_before = len(EmailService._client.emails.sent_messages)

    anon_csrf = get_anon_csrf(client)
    response = client.post(
        "/api/v1/auth/resend-verification",
        json={"email": "resendcooldown@example.com"},
        headers={"X-CSRF-TOKEN": anon_csrf},
    )
    assert response.status_code == 200
    assert response.json()["message"] == ResponseMessages.VERIFICATION_EMAIL_GENERIC_SENT
    sent_after = len(EmailService._client.emails.sent_messages)
    assert sent_after == sent_before

    user = User.get_by_email("resendcooldown@example.com")
    assert user is not None
    assert user.email_verification_token_hash == hash_verification_token(first_token)


def test_username_derivation_uniqueness(client):
    first = register_user(client, email="same.name@example.com", password="StrongPass123")
    second = register_user(client, email="same_name@example.com", password="StrongPass123")
    assert first["username"] != second["username"]
    assert first["username"].replace("_", "").startswith("samename")
    assert second["username"].replace("_", "").startswith("samename")


def test_get_by_id_invalid_returns_none(client):
    # `client` fixture initializes DB layer; this checks defensive behavior.
    assert User.get_by_id("not-an-object-id") is None


def test_me_returns_authenticated_user(client):
    created_user = register_user(client, email="me@example.com", password="StrongPass123")
    token = get_latest_verification_token()
    verify_email_token(client, token=token)
    login_user(client, email="me@example.com", password="StrongPass123")
    csrf = get_auth_csrf(client)
    response = client.get("/api/v1/auth/me", headers={"X-CSRF-TOKEN": csrf})
    assert response.status_code == 200
    user = response.json()["user"]
    assert user["email"] == created_user["email"]
    assert user["_id"] == created_user["_id"]


def test_refresh_uses_refresh_csrf(client):
    register_user(client, email="refresh@example.com", password="StrongPass123")
    token = get_latest_verification_token()
    verify_email_token(client, token=token)
    login_user(client, email="refresh@example.com", password="StrongPass123")
    refresh_csrf = get_refresh_csrf(client)
    response = client.post("/api/v1/auth/refresh", headers={"X-CSRF-TOKEN": refresh_csrf})
    assert response.status_code == 200


def test_logout_uses_access_csrf(client):
    register_user(client, email="logout@example.com", password="StrongPass123")
    token = get_latest_verification_token()
    verify_email_token(client, token=token)
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
    token = get_latest_verification_token()
    verify_email_token(client, token=token)
    login_user(client, email="csrfmismatch@example.com", password="StrongPass123")
    response = client.get("/api/v1/auth/me", headers={"X-CSRF-TOKEN": "bad-token"})
    assert response.status_code == 401
    assert response.json()["detail"] == ResponseMessages.INVALID_OR_EXPIRED_TOKEN


def test_refresh_rejects_wrong_token_type(client):
    register_user(client, email="wrongtype@example.com", password="StrongPass123")
    token = get_latest_verification_token()
    verify_email_token(client, token=token)
    login_user(client, email="wrongtype@example.com", password="StrongPass123")
    access_token = client.cookies.get("access_token_cookie")
    access_csrf = client.cookies.get("csrf_access_token")
    assert access_token
    assert access_csrf

    # Force refresh slot to carry an access token so type validation is exercised.
    client.cookies.set("refresh_token_cookie", access_token)
    client.cookies.set("csrf_refresh_token", access_csrf)

    response = client.post("/api/v1/auth/refresh", headers={"X-CSRF-TOKEN": access_csrf})
    assert response.status_code == 401
    assert response.json()["detail"] == ResponseMessages.INVALID_OR_EXPIRED_TOKEN


def test_me_rejects_malformed_token(client):
    register_user(client, email="badtoken@example.com", password="StrongPass123")
    token = get_latest_verification_token()
    verify_email_token(client, token=token)
    login_user(client, email="badtoken@example.com", password="StrongPass123")
    csrf = get_auth_csrf(client)
    client.cookies.set("access_token_cookie", "not-a-jwt")
    response = client.get("/api/v1/auth/me", headers={"X-CSRF-TOKEN": csrf})
    assert response.status_code == 401
    assert response.json()["detail"] == ResponseMessages.INVALID_OR_EXPIRED_TOKEN
