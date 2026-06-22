from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time

from pydantic import BaseModel, ConfigDict, Field


class SignedPlayerClaims(BaseModel):
    model_config = ConfigDict(extra="forbid")

    room_id: str = Field(min_length=1, max_length=64)
    player_id: str = Field(min_length=1, max_length=64)
    display_name: str = Field(min_length=1, max_length=80)
    role: str = Field(default="player")
    iat: int = Field(ge=0)
    exp: int = Field(ge=0)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * ((4 - len(value) % 4) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _sign_payload(payload_segment: str, secret: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), payload_segment.encode("ascii"), hashlib.sha256).digest()
    return _b64url_encode(digest)


def issue_player_token(
    *,
    secret: str,
    room_id: str,
    player_id: str,
    display_name: str,
    role: str = "player",
    ttl_sec: int = 86_400,
    now_unix: int | None = None,
) -> tuple[str, SignedPlayerClaims]:
    now = int(time.time() if now_unix is None else now_unix)
    claims = SignedPlayerClaims(
        room_id=room_id,
        player_id=player_id,
        display_name=display_name,
        role=role,
        iat=now,
        exp=now + max(1, ttl_sec),
    )
    payload = json.dumps(
        claims.model_dump(exclude_none=True, by_alias=False),
        separators=(",", ":"),
    ).encode("utf-8")
    payload_segment = _b64url_encode(payload)
    sig_segment = _sign_payload(payload_segment, secret)
    return f"{payload_segment}.{sig_segment}", claims


def verify_player_token(
    token: str,
    *,
    secret: str,
    expected_room_id: str | None = None,
    now_unix: int | None = None,
) -> SignedPlayerClaims | None:
    try:
        payload_segment, sig_segment = token.split(".", 1)
    except ValueError:
        return None

    expected_sig = _sign_payload(payload_segment, secret)
    if not secrets.compare_digest(expected_sig, sig_segment):
        return None

    try:
        payload_raw = _b64url_decode(payload_segment)
        payload_obj = json.loads(payload_raw.decode("utf-8"))
        claims = SignedPlayerClaims.model_validate(payload_obj)
    except Exception:
        return None

    now = int(time.time() if now_unix is None else now_unix)
    if claims.exp <= now:
        return None

    if expected_room_id is not None and claims.room_id != expected_room_id:
        return None

    return claims


def validate_admin_key(candidate: str | None, expected: str) -> bool:
    if not candidate:
        return False
    return secrets.compare_digest(candidate, expected)
