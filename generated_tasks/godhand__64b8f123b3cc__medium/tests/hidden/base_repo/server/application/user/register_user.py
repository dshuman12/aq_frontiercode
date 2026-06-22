from __future__ import annotations

import re
from typing import Any

from werkzeug.security import generate_password_hash

from server.external.db.models.user import User
from server.utils.constants import ResponseMessages, ValidationConstraints
from server.utils.error_handlers import ConflictError, DomainValidationError


def build_unique_username(base: str) -> str:
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


def derive_username_from_email(email: str) -> str:
    local_part = email.split("@", 1)[0]
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "", local_part).lower()
    if not cleaned:
        cleaned = "user"
    return build_unique_username(cleaned)


def register_user(payload: dict[str, Any]) -> User | None:
    required = ("email", "password")
    if any(not str(payload.get(field, "")).strip() for field in required):
        raise DomainValidationError(ResponseMessages.MISSING_CREDENTIALS)

    email = str(payload["email"]).strip().lower()
    password = str(payload["password"])
    raw_username = payload.get("username")
    username_input = raw_username.strip().lower() if isinstance(raw_username, str) else ""

    if User.get_by_email(email):
        raise ConflictError(ResponseMessages.USER_ALREADY_EXISTS)

    username = username_input or derive_username_from_email(email)
    if User.get_by_username(username):
        raise ConflictError(ResponseMessages.USER_ALREADY_EXISTS)

    hashed_password = generate_password_hash(password)
    user = User.create(
        username=username,
        email=email,
        password=hashed_password,
    )
    if not user:
        raise ConflictError(ResponseMessages.USER_ALREADY_EXISTS)

    return user
