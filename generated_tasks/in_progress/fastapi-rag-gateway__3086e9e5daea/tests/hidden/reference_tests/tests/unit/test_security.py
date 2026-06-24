"""Security helpers tests."""

from __future__ import annotations

import pytest

from app.core.exceptions import AuthenticationError
from app.core.security import (
    create_access_token,
    create_refresh_token,
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


def test_decode_token_accepts_matching_type() -> None:
    access = decode_token(create_access_token(subject="u"), expected_type="access")
    assert access.type == "access"
    refresh = decode_token(create_refresh_token(subject="u"), expected_type="refresh")
    assert refresh.type == "refresh"


def test_refresh_token_rejected_where_access_required() -> None:
    refresh = create_refresh_token(subject="user-1")
    with pytest.raises(AuthenticationError):
        decode_token(refresh, expected_type="access")


def test_access_token_rejected_where_refresh_required() -> None:
    access = create_access_token(subject="user-1")
    with pytest.raises(AuthenticationError):
        decode_token(access, expected_type="refresh")


def test_decode_token_without_expected_type_is_permissive() -> None:
    # When no specific type is required, any well-formed token decodes.
    refresh = create_refresh_token(subject="user-1")
    payload = decode_token(refresh)
    assert payload.sub == "user-1"
    assert payload.type == "refresh"
