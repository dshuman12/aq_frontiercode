"""Security helpers tests."""

from __future__ import annotations

from app.core.security import (
    create_access_token,
    decode_token,
    generate_api_key,
    hash_api_key,
    hash_password,
    verify_password,
)


def test_password_hashes_round_trip() -> None:
    hashed = hash_password("Password123!")
    assert hashed != "Password123!"
    assert verify_password("Password123!", hashed)
    assert not verify_password("wrong", hashed)


def test_api_key_helpers() -> None:
    pair = generate_api_key(prefix="rgw")
    assert pair.plaintext.startswith("rgw_")
    digest = hash_api_key(pair.plaintext)
    assert digest != pair.plaintext
    assert hash_api_key(pair.plaintext) == digest


def test_jwt_round_trip() -> None:
    token = create_access_token(subject="user-1", scopes=["user", "admin"])
    assert isinstance(token, str)
    payload = decode_token(token, expected_type="access")
    assert payload.sub == "user-1"
    assert "admin" in payload.scope
