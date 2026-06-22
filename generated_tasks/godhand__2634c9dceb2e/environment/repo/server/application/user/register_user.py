from __future__ import annotations

import re
from typing import Any

from werkzeug.security import generate_password_hash

from server.application.user.email_verification import (
    build_verify_url,
    generate_verification_token,
    hash_verification_token,
    utc_now,
    verification_expiry,
)
from server.external.db.models.user import User
from server.external.services.email_service import EmailService
from server.utils.constants import ResponseMessages, ValidationConstraints
from server.utils.error_handlers import ConflictError, DomainValidationError
from server.utils.logging import get_app_logger

app_logger = get_app_logger()

def _build_unique_username(base: str) -> str:
    base = base[: ValidationConstraints.USERNAME_MAX_LENGTH]
    if len(base) < ValidationConstraints.USERNAME_MIN_LENGTH:
        base = f"{base}{'user'}"[: ValidationConstraints.USERNAME_MIN_LENGTH]

    candidate = base
    suffix = 0
    while User.get_by_username(candidate):
        suffix += 1
        suffix_text = str(suffix)
        trim_len = ValidationConstraints.USERNAME_MAX_LENGTH - len(suffix_text)
        candidate = f"{base[:trim_len]}{suffix_text}"
    return candidate

def _derive_username(email: str) -> str:
    local_part = email.split("@", 1)[0]
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "", local_part).lower()
    if not cleaned:
        cleaned = "user"
    return _build_unique_username(cleaned)

def register_user(payload: dict[str, Any]) -> User | None:

    # Validate required fields
    required = ("email", "password", "first_name", "last_name")
    if any(not str(payload.get(field, "")).strip() for field in required):
        raise DomainValidationError(ResponseMessages.MISSING_CREDENTIALS)

    # Normalize and validate email
    email = str(payload["email"]).strip().lower()
    password = str(payload["password"])
    first_name = str(payload["first_name"]).strip()
    last_name = str(payload["last_name"]).strip()
    if User.get_by_email(email):
        raise ConflictError(ResponseMessages.USER_ALREADY_EXISTS)

    username = _derive_username(email)
    hashed_password = generate_password_hash(password)

    user = User.create(
        username=username,
        email=email,
        password=hashed_password,
        first_name=first_name,
        last_name=last_name,
        is_verified=False,
    )
    if not user:
        raise ConflictError(ResponseMessages.USER_ALREADY_EXISTS)

    raw_token = generate_verification_token()
    token_hash = hash_verification_token(raw_token)
    expires_at = verification_expiry()
    user.set_email_verification_token(token_hash, expires_at)
    verify_url = build_verify_url(raw_token)

    # Try to send verification email.
    try:
        EmailService.send_verification_email(user.email, user.username, verify_url)
        user.set_last_verification_email_sent_at(utc_now())
    except Exception as exc:
        app_logger.warning(f"Failed to send verification email to {user.email}: {exc}")

    return user
