from __future__ import annotations

import hmac
from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe
from typing import Any
from uuid import uuid4
from urllib.parse import urlparse

import jwt
from fastapi import Request, Response
from fastapi import WebSocket

from server.api.security.cookies import CookieUtils
from server.config import get_app_config
from server.utils.constants import ResponseMessages
from server.utils.error_handlers import AuthenticationError
from server.utils.logging import get_app_logger

app_logger = get_app_logger()

_ALGORITHM = "HS256"
_ACCESS_TOKEN_COOKIE = "access_token_cookie"
_REFRESH_TOKEN_COOKIE = "refresh_token_cookie"
_ACCESS_CSRF_COOKIE = "csrf_access_token"
_REFRESH_CSRF_COOKIE = "csrf_refresh_token"
_ACCESS_TOKEN_TTL = timedelta(minutes=15)
_REFRESH_TOKEN_TTL = timedelta(days=30)


class JWTService:
    @staticmethod
    def _normalize_origin(origin: str) -> str:
        return (origin or "").strip().rstrip("/")

    @staticmethod
    def _is_local_dev_origin(origin: str) -> bool:
        try:
            parsed = urlparse(origin)
        except Exception:
            return False
        if parsed.scheme not in {"http", "https"}:
            return False
        return parsed.hostname in {"localhost", "127.0.0.1", "::1"}

    @staticmethod
    def _now_utc() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _token_claims(*, user_id: str, token_type: str, csrf_token: str, ttl: timedelta) -> dict[str, Any]:
        now = JWTService._now_utc()
        return {
            "sub": user_id,
            "type": token_type,
            "csrf": csrf_token,
            "iat": now,
            "nbf": now,
            "exp": now + ttl,
            "jti": str(uuid4()),
        }

    @staticmethod
    def _encode_token(claims: dict[str, Any]) -> str:
        cfg = get_app_config()
        return jwt.encode(claims, cfg.JWT_SECRET_KEY, algorithm=_ALGORITHM)

    @staticmethod
    def _decode_token(token: str) -> dict[str, Any]:
        cfg = get_app_config()
        return jwt.decode(
            token,
            cfg.JWT_SECRET_KEY,
            algorithms=[_ALGORITHM],
            options={"require": ["sub", "type", "csrf", "iat", "nbf", "exp", "jti"]},
        )

    @staticmethod
    def _set_jwt_cookie(response: Response, name: str, token: str, ttl: timedelta) -> None:
        CookieUtils.set_cookie(
            response,
            name,
            token,
            max_age=int(ttl.total_seconds()),
            httponly=True,
        )

    @staticmethod
    def _set_csrf_cookie(response: Response, name: str, token: str, ttl: timedelta) -> None:
        CookieUtils.set_cookie(
            response,
            name,
            token,
            max_age=int(ttl.total_seconds()),
            httponly=False,
        )

    @staticmethod
    def create_and_set_tokens(response: Response, user_id: str) -> None:
        access_csrf = token_urlsafe(32)
        refresh_csrf = token_urlsafe(32)

        access_token = JWTService._encode_token(
            JWTService._token_claims(
                user_id=user_id,
                token_type="access",
                csrf_token=access_csrf,
                ttl=_ACCESS_TOKEN_TTL,
            )
        )
        refresh_token = JWTService._encode_token(
            JWTService._token_claims(
                user_id=user_id,
                token_type="refresh",
                csrf_token=refresh_csrf,
                ttl=_REFRESH_TOKEN_TTL,
            )
        )

        JWTService._set_jwt_cookie(response, _ACCESS_TOKEN_COOKIE, access_token, _ACCESS_TOKEN_TTL)
        JWTService._set_jwt_cookie(response, _REFRESH_TOKEN_COOKIE, refresh_token, _REFRESH_TOKEN_TTL)
        JWTService._set_csrf_cookie(response, _ACCESS_CSRF_COOKIE, access_csrf, _ACCESS_TOKEN_TTL)
        JWTService._set_csrf_cookie(response, _REFRESH_CSRF_COOKIE, refresh_csrf, _REFRESH_TOKEN_TTL)
        app_logger.info(f"Issued JWT cookies for user_id={user_id}")

    @staticmethod
    def clear_tokens(response: Response) -> None:
        CookieUtils.delete_cookie(response, _ACCESS_TOKEN_COOKIE)
        CookieUtils.delete_cookie(response, _REFRESH_TOKEN_COOKIE)
        CookieUtils.delete_cookie(response, _ACCESS_CSRF_COOKIE)
        CookieUtils.delete_cookie(response, _REFRESH_CSRF_COOKIE)
        app_logger.info("Cleared JWT cookies")

    @staticmethod
    def _require_token(request: Request, *, token_type: str, token_cookie: str, csrf_cookie: str) -> dict[str, Any]:
        cfg = get_app_config()
        header_name = cfg.CSRF_HEADER_NAME or "X-CSRF-TOKEN"
        header_csrf = request.headers.get(header_name)
        raw_token = request.cookies.get(token_cookie)
        cookie_csrf = request.cookies.get(csrf_cookie)

        if not raw_token:
            raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)
        if not header_csrf or not cookie_csrf:
            raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

        try:
            claims = JWTService._decode_token(raw_token)
        except Exception as exc:
            app_logger.warning(f"JWT decode failed: {exc}")
            raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

        claim_csrf = claims.get("csrf")
        if (
            claims.get("type") != token_type
            or not claim_csrf
            or not hmac.compare_digest(header_csrf, cookie_csrf)
            or not hmac.compare_digest(str(claim_csrf), cookie_csrf)
        ):
            raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

        return claims

    @staticmethod
    def require_access(request: Request) -> dict[str, Any]:
        try:
            return JWTService._require_token(
                request,
                token_type="access",
                token_cookie=_ACCESS_TOKEN_COOKIE,
                csrf_cookie=_ACCESS_CSRF_COOKIE,
            )
        except AuthenticationError:
            raise
        except Exception as exc:
            app_logger.warning(f"JWT access check failed: {exc}")
            raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

    @staticmethod
    def require_access_websocket(websocket: WebSocket) -> dict[str, Any]:
        """
        Validate access JWT for websocket handshakes.
        Unlike HTTP access checks, websocket auth does not require CSRF header/cookie
        pairing because browsers do not allow setting custom headers for native WS APIs.
        """
        cfg = get_app_config()
        origin = JWTService._normalize_origin(websocket.headers.get("origin") or "")
        allowed_origins = {
            JWTService._normalize_origin(str(item))
            for item in (cfg.CORS_ALLOWED_ORIGINS or [])
            if str(item).strip()
        }
        # Block cross-site websocket hijacking attempts by requiring browser Origin
        # to match an allowed frontend origin.
        if not origin:
            if not getattr(cfg, "IS_DEV", False):
                raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)
        elif origin not in allowed_origins:
            if getattr(cfg, "IS_DEV", False) and JWTService._is_local_dev_origin(origin):
                pass
            else:
                raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

        raw_token = websocket.cookies.get(_ACCESS_TOKEN_COOKIE)
        if not raw_token:
            raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)
        try:
            claims = JWTService._decode_token(raw_token)
        except Exception as exc:
            app_logger.warning(f"WS JWT decode failed: {exc}")
            raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

        if claims.get("type") != "access" or not claims.get("sub"):
            raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)
        return claims

    @staticmethod
    def require_refresh(request: Request) -> dict[str, Any]:
        try:
            return JWTService._require_token(
                request,
                token_type="refresh",
                token_cookie=_REFRESH_TOKEN_COOKIE,
                csrf_cookie=_REFRESH_CSRF_COOKIE,
            )
        except AuthenticationError:
            raise
        except Exception as exc:
            app_logger.warning(f"JWT refresh check failed: {exc}")
            raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

    @staticmethod
    def refresh_access_token(response: Response, user_id: str) -> None:
        access_csrf = token_urlsafe(32)
        access_token = JWTService._encode_token(
            JWTService._token_claims(
                user_id=user_id,
                token_type="access",
                csrf_token=access_csrf,
                ttl=_ACCESS_TOKEN_TTL,
            )
        )
        JWTService._set_jwt_cookie(response, _ACCESS_TOKEN_COOKIE, access_token, _ACCESS_TOKEN_TTL)
        JWTService._set_csrf_cookie(response, _ACCESS_CSRF_COOKIE, access_csrf, _ACCESS_TOKEN_TTL)
        app_logger.info(f"Refreshed access token for user_id={user_id}")
