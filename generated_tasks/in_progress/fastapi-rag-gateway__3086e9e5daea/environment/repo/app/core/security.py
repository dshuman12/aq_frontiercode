"""Security primitives — password hashing, JWT, API key handling.

The implementation deliberately keeps a minimal interface so the
underlying crypto library can be swapped without refactoring callers.
:mod:`passlib` and :mod:`jose` are the canonical choices but each is
imported lazily and gracefully degrades to standard-library equivalents
when unavailable, which makes static analysis and offline test
environments more pleasant.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import time
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.config import Settings, get_settings
from app.core.constants import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    API_KEY_PREFIX,
    API_KEY_RANDOM_BYTES,
    PASSWORD_HASH_ROUNDS,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    ValidationError,
)

try:  # pragma: no cover - optional
    from passlib.context import CryptContext

    _PWD_CONTEXT: CryptContext | None = CryptContext(
        schemes=["bcrypt"],
        deprecated="auto",
        bcrypt__rounds=PASSWORD_HASH_ROUNDS,
    )
except Exception:  # pragma: no cover - fallback
    _PWD_CONTEXT = None

try:  # pragma: no cover - optional
    from jose import JWTError
    from jose import jwt as _jwt
except Exception:  # pragma: no cover - fallback
    _jwt = None

    class JWTError(Exception):
        """Lightweight stand-in when ``python-jose`` is unavailable."""


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    """Return a salted hash for ``password``."""

    _validate_password(password)
    if _PWD_CONTEXT is not None:
        return _PWD_CONTEXT.hash(password)
    return _fallback_hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Constant-time check that ``password`` matches ``hashed``."""

    if not hashed:
        return False
    if _PWD_CONTEXT is not None:
        try:
            return _PWD_CONTEXT.verify(password, hashed)
        except Exception:
            return False
    return _fallback_verify(password, hashed)


def password_needs_rehash(hashed: str) -> bool:
    if _PWD_CONTEXT is None:
        return False
    try:
        return _PWD_CONTEXT.needs_update(hashed)
    except Exception:
        return False


def _validate_password(password: str) -> None:
    if not isinstance(password, str):
        raise ValidationError("Password must be a string.")
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValidationError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters long.")
    if len(password) > PASSWORD_MAX_LENGTH:
        raise ValidationError(f"Password must be at most {PASSWORD_MAX_LENGTH} characters long.")


def _fallback_hash(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
        dklen=64,
    )
    return "scrypt$" + base64.urlsafe_b64encode(salt + digest).decode("ascii")


def _fallback_verify(password: str, hashed: str) -> bool:
    if not hashed.startswith("scrypt$"):
        return False
    try:
        decoded = base64.urlsafe_b64decode(hashed.split("$", 1)[1])
    except Exception:
        return False
    salt, digest = decoded[:16], decoded[16:]
    candidate = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
        dklen=64,
    )
    return hmac.compare_digest(candidate, digest)


# ---------------------------------------------------------------------------
# Tokens
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class TokenPayload:
    """Decoded JWT payload."""

    sub: str
    type: str
    exp: int
    iat: int
    jti: str
    scope: tuple[str, ...] = ()
    extra: dict[str, Any] | None = None


def create_access_token(
    subject: str,
    *,
    scopes: Iterable[str] | None = None,
    extra: Mapping[str, Any] | None = None,
    expires_delta: timedelta | None = None,
    settings: Settings | None = None,
) -> str:
    return _create_token(
        subject,
        token_type="access",
        scopes=scopes,
        extra=extra,
        expires_delta=expires_delta
        or timedelta(minutes=(settings or get_settings()).access_token_expire_minutes),
        settings=settings,
    )


def create_refresh_token(
    subject: str,
    *,
    extra: Mapping[str, Any] | None = None,
    expires_delta: timedelta | None = None,
    settings: Settings | None = None,
) -> str:
    return _create_token(
        subject,
        token_type="refresh",
        extra=extra,
        expires_delta=expires_delta
        or timedelta(days=(settings or get_settings()).refresh_token_expire_days),
        settings=settings,
    )


def decode_token(
    token: str, *, expected_type: str | None = None, settings: Settings | None = None
) -> TokenPayload:
    settings = settings or get_settings()
    secret = settings.secret("secret_key")
    if not secret:
        raise AuthenticationError("Server is missing a JWT secret key.")
    try:
        if _jwt is None:  # pragma: no cover - fallback
            payload = _fallback_decode(token, secret)
        else:
            payload = _jwt.decode(token, secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:  # pragma: no cover - upstream behaviour
        raise AuthenticationError("Invalid or expired token.", cause=exc) from exc
    return TokenPayload(
        sub=str(payload["sub"]),
        type=str(payload.get("type", "access")),
        exp=int(payload["exp"]),
        iat=int(payload.get("iat", 0)),
        jti=str(payload.get("jti", "")),
        scope=tuple(payload.get("scope", []) or ()),
        extra={k: v for k, v in payload.items() if k not in _RESERVED_CLAIMS},
    )


def _create_token(
    subject: str,
    *,
    token_type: str,
    scopes: Iterable[str] | None = None,
    extra: Mapping[str, Any] | None = None,
    expires_delta: timedelta,
    settings: Settings | None = None,
) -> str:
    settings = settings or get_settings()
    secret = settings.secret("secret_key")
    if not secret:
        raise AuthenticationError("Server is missing a JWT secret key.")
    now = datetime.now(tz=UTC)
    exp = now + expires_delta
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": secrets.token_hex(16),
    }
    if scopes:
        payload["scope"] = list(scopes)
    if extra:
        payload.update({k: v for k, v in extra.items() if k not in _RESERVED_CLAIMS})
    if _jwt is None:  # pragma: no cover - fallback
        return _fallback_encode(payload, secret, settings.jwt_algorithm)
    return _jwt.encode(payload, secret, algorithm=settings.jwt_algorithm)


_RESERVED_CLAIMS = {"sub", "type", "iat", "exp", "jti", "scope"}


# ---------------------------------------------------------------------------
# Fallback JWT (HS256 only) when python-jose is unavailable.
# ---------------------------------------------------------------------------


def _fallback_encode(payload: Mapping[str, Any], secret: str, algorithm: str) -> str:
    if algorithm != "HS256":  # pragma: no cover - fallback supports HS256 only
        raise AuthenticationError(f"Algorithm {algorithm!r} requires python-jose to be installed.")
    import json

    header = {"alg": "HS256", "typ": "JWT"}
    segments = [
        _b64url(json.dumps(header, separators=(",", ":")).encode("utf-8")),
        _b64url(json.dumps(dict(payload), separators=(",", ":")).encode("utf-8")),
    ]
    signing_input = ".".join(segments).encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    segments.append(_b64url(signature))
    return ".".join(segments)


def _fallback_decode(token: str, secret: str) -> dict[str, Any]:
    import json

    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError as exc:
        raise JWTError("Malformed token") from exc
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    actual = _b64url_decode(signature_b64)
    if not hmac.compare_digest(expected, actual):
        raise JWTError("Bad signature")
    payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    if "exp" in payload and payload["exp"] < int(time.time()):
        raise JWTError("Token expired")
    return payload


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


# ---------------------------------------------------------------------------
# API keys
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class ApiKeyPair:
    """A freshly minted API key plus its hashed representation."""

    plaintext: str
    hashed: str
    prefix: str
    last_four: str


def generate_api_key(prefix: str | None = None) -> ApiKeyPair:
    """Generate a new API key pair (plaintext + storable hash)."""

    raw = secrets.token_urlsafe(API_KEY_RANDOM_BYTES)
    prefix = prefix or API_KEY_PREFIX
    plaintext = f"{prefix}_{raw}"
    return ApiKeyPair(
        plaintext=plaintext,
        hashed=hash_api_key(plaintext),
        prefix=prefix,
        last_four=raw[-4:],
    )


def hash_api_key(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode("utf-8")).hexdigest()


def verify_api_key(plaintext: str, hashed: str) -> bool:
    if not plaintext or not hashed:
        return False
    return hmac.compare_digest(hash_api_key(plaintext), hashed)


# ---------------------------------------------------------------------------
# Scopes / RBAC helpers
# ---------------------------------------------------------------------------


def require_scopes(actual: Iterable[str], required: Iterable[str]) -> None:
    """Raise :class:`AuthorizationError` if ``required`` is not a subset."""

    actual_set = set(actual or ())
    missing = [s for s in required if s not in actual_set]
    if missing:
        raise AuthorizationError(
            f"Missing required scope(s): {', '.join(missing)}",
        )


def constant_time_compare(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


def random_token(num_bytes: int = 32) -> str:
    return secrets.token_urlsafe(num_bytes)


def utc_now() -> datetime:
    return datetime.now(tz=UTC)


__all__ = [
    "TokenPayload",
    "ApiKeyPair",
    "hash_password",
    "verify_password",
    "password_needs_rehash",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "generate_api_key",
    "hash_api_key",
    "verify_api_key",
    "require_scopes",
    "constant_time_compare",
    "random_token",
    "utc_now",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "REFRESH_TOKEN_EXPIRE_DAYS",
    "JWTError",
]


# Some platforms strip ``os`` import when only used for env defaults
# elsewhere — keep an explicit reference to avoid linter false positives.
_ = os.environ
