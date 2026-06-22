from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe
from urllib.parse import urlencode

from server.config import get_app_config

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def hash_verification_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()

def generate_verification_token() -> str:
    return token_urlsafe(48)

def verification_expiry(hours: int | None = None) -> datetime:
    cfg = get_app_config()
    ttl_hours = hours if hours is not None else cfg.EMAIL_VERIFY_TOKEN_TTL_HOURS
    return utc_now() + timedelta(hours=ttl_hours)

def is_expired(expires_at: datetime | None) -> bool:
    if expires_at is None:
        return True
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return utc_now() >= expires_at

def is_cooldown_elapsed(last_sent_at: datetime | None, cooldown_seconds: int) -> bool:
    if last_sent_at is None:
        return True
    if last_sent_at.tzinfo is None:
        last_sent_at = last_sent_at.replace(tzinfo=timezone.utc)
    return utc_now() >= last_sent_at + timedelta(seconds=cooldown_seconds)

def build_verify_url(token: str) -> str:
    cfg = get_app_config()
    base = cfg.BASE_URL_1 or cfg.BASE_URL
    if not base:
        host = cfg.FASTAPI_RUN_HOST if cfg.FASTAPI_RUN_HOST != "0.0.0.0" else "localhost"
        base = f"http://{host}:{cfg.FASTAPI_RUN_PORT}"
    query = urlencode({"token": token})
    return f"{base.rstrip('/')}/api/v1/auth/verify-email?{query}"
