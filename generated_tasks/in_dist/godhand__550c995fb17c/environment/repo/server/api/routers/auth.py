"""
Authentication routes module.

This module defines authentication-related routes including user registration,
login, logout, and Google OAuth integration.
"""

from __future__ import annotations

from secrets import token_urlsafe
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import requests
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, RedirectResponse

from server.api.schemas.auth import (
    LoginRequest,
    OAuthLinkStartResponse,
    RegisterRequest,
    RegisterResponse,
    UpdateUsernameRequest,
    UserResponse,
)
from server.api.schemas.user import to_public_user
from server.api.security.cookies import CookieUtils
from server.api.security.csrf import Csrf, verify_anon_csrf
from server.api.security.jwt import JWTService
from server.api.security.rate_limit import (
    limit_login_rate,
    limit_register_rate,
)
from server.application.user.login_user import login_user as userServiceLogin
from server.application.user.register_user import (
    build_unique_username,
    register_user as userServiceRegister,
)
from server.config import get_app_config
from server.external.db.models.user import User as UserModel
from server.utils.constants import HttpStatus, ResponseMessages
from server.utils.error_handlers import (
    AuthenticationError,
    ConflictError,
    ConfigurationError,
    DomainValidationError,
    NotFoundError,
)
from server.utils.logging import get_app_logger

app_logger = get_app_logger()

auth_routes = APIRouter(prefix="/api/v1/auth", tags=["auth"])
_GOOGLE_OAUTH_STATE_COOKIE = "oauth_google_state"
_GOOGLE_OAUTH_LINK_USER_COOKIE = "oauth_google_link_user_id"
_GOOGLE_OAUTH_STATE_TTL_SECONDS = 10 * 60
_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
_GOOGLE_LINK_REASON_ALREADY_LINKED = "already_linked"
_GOOGLE_OAUTH_REASON_INVALID_STATE = "invalid_state"
_GOOGLE_OAUTH_REASON_MISSING_CODE = "missing_code"
_GOOGLE_OAUTH_REASON_CONFIG_MISSING = "config_missing"
_GOOGLE_OAUTH_REASON_EXCHANGE_FAILED = "exchange_failed"
_GOOGLE_OAUTH_REASON_UNVERIFIED_EMAIL = "unverified_email"
_GOOGLE_OAUTH_REASON_EMAIL_CONFLICT = "email_conflict"
_GOOGLE_OAUTH_REASON_CREATE_FAILED = "create_failed"
_GOOGLE_OAUTH_NOTICE_LINKED_EXISTING_EMAIL = "linked_existing_email"

def _google_oauth_config() -> tuple[str, str, str] | None:
    cfg = get_app_config()
    client_id = (cfg.GOOGLE_CLIENT_ID or "").strip()
    client_secret = (cfg.GOOGLE_CLIENT_SECRET or "").strip()
    redirect_uri = (cfg.GOOGLE_OAUTH_REDIRECT_URI or "").strip()
    if not client_id or not client_secret or not redirect_uri:
        return None
    return client_id, client_secret, redirect_uri


def _resolve_google_redirect_uri(configured_redirect_uri: str, request: Request | None) -> str:
    """
    Prefer configured URI, but in local dev normalize localhost port to match
    the current request host/port so docker-exposed port mismatches do not break OAuth.
    """
    if request is None:
        return configured_redirect_uri

    parsed = urlparse(configured_redirect_uri)
    req_host = (request.url.hostname or "").strip().lower()
    req_port = request.url.port
    if (
        parsed.scheme in {"http", "https"}
        and parsed.hostname in {"localhost", "127.0.0.1"}
        and req_host in {"localhost", "127.0.0.1"}
        and req_port
        and parsed.port != req_port
    ):
        normalized = parsed._replace(netloc=f"{req_host}:{req_port}")
        return urlunparse(normalized)
    return configured_redirect_uri


def _url_with_query_value(url: str, key: str, value: str) -> str:
    parsed = urlparse(url)
    query_pairs = [(k, v) for (k, v) in parse_qsl(parsed.query, keep_blank_values=True) if k != key]
    query_pairs.append((key, value))
    return urlunparse(parsed._replace(query=urlencode(query_pairs)))


def _oauth_redirect_with_reason(
    base_url: str,
    reason: str | None,
) -> RedirectResponse:
    target_url = base_url
    if reason:
        target_url = _url_with_query_value(target_url, "oauth_reason", reason)
    return RedirectResponse(url=target_url, status_code=307)


@auth_routes.get("/csrf-token")
def issue_anon_csrf_token():
    """
    Provide an anonymous CSRF token for unauthenticated clients.
    This is the only endpoint that is exempt from CSRF checks.
    Requires: no auth, no CSRF token
    """
    token = token_urlsafe(32)
    response = JSONResponse({"csrf_token": token}, status_code=HttpStatus.OK)
    Csrf.issue_anon_csrf_token(response, token=token)
    return response


@auth_routes.post(
    "/register",
    status_code=HttpStatus.CREATED,
    response_model=RegisterResponse,
    dependencies=[Depends(limit_register_rate), Depends(verify_anon_csrf)],
)
def register_user(payload: RegisterRequest):
    """
    Create a new user and return user data.
    Requires: email + password in body, optional username in body, anonymous CSRF token in header.
    """
    user = userServiceRegister(payload.model_dump())
    if not user:
        raise DomainValidationError(ResponseMessages.REGISTRATION_FAILED)

    public_user = to_public_user(user)
    response = JSONResponse(
        {
            "message": ResponseMessages.USER_REGISTERED_SUCCESS,
            "user": public_user.model_dump(mode="json", by_alias=True),
        },
        status_code=HttpStatus.CREATED,
    )
    app_logger.info(f"User registered: email={user.email}")
    return response


@auth_routes.post(
    "/login",
    status_code=HttpStatus.OK,
    response_model=UserResponse,
    dependencies=[Depends(limit_login_rate), Depends(verify_anon_csrf)],
)
def login_user(payload: LoginRequest):
    """
    Verify credentials, set JWT cookies, return user data (sans password).
    Requires: identifier (username or email) + password in body, anonymous CSRF token in header.
    """
    user = userServiceLogin(
        identifier=payload.identifier,
        password=payload.password,
    )
    if not user:
        app_logger.warning(f"Login failed for identifier={payload.identifier}")
        raise AuthenticationError(ResponseMessages.INVALID_CREDENTIALS)

    public_user = to_public_user(user)
    response = JSONResponse(
        {"user": public_user.model_dump(mode="json", by_alias=True)},
        status_code=HttpStatus.OK,
    )
    JWTService.create_and_set_tokens(response, str(user.id))

    # Remove anonymous CSRF once authenticated
    Csrf.clear_anon_csrf(response)

    app_logger.info(f"User logged in: identifier={payload.identifier}")
    return response


@auth_routes.get("/google/login", status_code=HttpStatus.OK)
def google_login(request: Request):
    """
    Start Google OAuth flow.
    """
    google_cfg = _google_oauth_config()
    if google_cfg is None:
        raise ConfigurationError(ResponseMessages.OAUTH_CONFIG_MISSING)
    client_id, _client_secret, configured_redirect_uri = google_cfg
    redirect_uri = _resolve_google_redirect_uri(configured_redirect_uri, request)

    state = token_urlsafe(32)
    params = urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "online",
            "prompt": "select_account",
            "state": state,
        }
    )
    response = RedirectResponse(url=f"{_GOOGLE_AUTH_URL}?{params}", status_code=307)
    CookieUtils.delete_cookie(response, _GOOGLE_OAUTH_LINK_USER_COOKIE)
    CookieUtils.set_cookie(
        response,
        _GOOGLE_OAUTH_STATE_COOKIE,
        state,
        max_age=_GOOGLE_OAUTH_STATE_TTL_SECONDS,
        httponly=True,
    )
    return response


@auth_routes.post("/google/link/start", status_code=HttpStatus.OK, response_model=OAuthLinkStartResponse)
def google_link_start(request: Request):
    """
    Start Google OAuth flow for linking a Google account to the current authenticated user.
    Requires: access JWT cookies + X-CSRF-TOKEN matching csrf_access_token.
    """
    claims = JWTService.require_access(request)
    user_id = claims.get("sub")
    if not user_id:
        raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

    user = UserModel.get_by_id(user_id)
    if not user:
        raise NotFoundError(ResponseMessages.USER_NOT_FOUND)

    google_cfg = _google_oauth_config()
    if google_cfg is None:
        raise ConfigurationError(ResponseMessages.OAUTH_CONFIG_MISSING)
    client_id, _client_secret, configured_redirect_uri = google_cfg
    redirect_uri = _resolve_google_redirect_uri(configured_redirect_uri, request)

    state = token_urlsafe(32)
    params = urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "online",
            "prompt": "select_account",
            "state": state,
        }
    )
    url = f"{_GOOGLE_AUTH_URL}?{params}"
    response = JSONResponse({"url": url}, status_code=HttpStatus.OK)
    CookieUtils.set_cookie(
        response,
        _GOOGLE_OAUTH_STATE_COOKIE,
        state,
        max_age=_GOOGLE_OAUTH_STATE_TTL_SECONDS,
        httponly=True,
    )
    CookieUtils.set_cookie(
        response,
        _GOOGLE_OAUTH_LINK_USER_COOKIE,
        user_id,
        max_age=_GOOGLE_OAUTH_STATE_TTL_SECONDS,
        httponly=True,
    )
    return response


@auth_routes.get("/google/callback", status_code=HttpStatus.OK)
def google_callback(request: Request, code: str | None = None, state: str | None = None):
    """
    Handle Google OAuth callback.
    """
    cfg = get_app_config()
    failure_redirect = cfg.FRONTEND_OAUTH_FAILURE_URL
    success_redirect = cfg.FRONTEND_OAUTH_SUCCESS_URL
    link_failure_redirect = cfg.FRONTEND_OAUTH_LINK_FAILURE_URL
    link_success_redirect = cfg.FRONTEND_OAUTH_LINK_SUCCESS_URL
    oauth_notice: str | None = None

    link_user_id = request.cookies.get(_GOOGLE_OAUTH_LINK_USER_COOKIE)
    is_link_flow = bool(link_user_id)

    def _failure(reason: str | None = None) -> RedirectResponse:
        if is_link_flow:
            response = RedirectResponse(url=link_failure_redirect, status_code=307)
        else:
            response = _oauth_redirect_with_reason(failure_redirect, reason)
        CookieUtils.delete_cookie(response, _GOOGLE_OAUTH_STATE_COOKIE)
        CookieUtils.delete_cookie(response, _GOOGLE_OAUTH_LINK_USER_COOKIE)
        return response

    cookie_state = request.cookies.get(_GOOGLE_OAUTH_STATE_COOKIE)
    if not state or not cookie_state or state != cookie_state:
        app_logger.warning("Google OAuth callback rejected due to invalid state.")
        return _failure(_GOOGLE_OAUTH_REASON_INVALID_STATE)
    if not code:
        app_logger.warning("Google OAuth callback missing authorization code.")
        return _failure(_GOOGLE_OAUTH_REASON_MISSING_CODE)

    google_cfg = _google_oauth_config()
    if google_cfg is None:
        app_logger.warning("Google OAuth callback requested without server OAuth configuration.")
        return _failure(_GOOGLE_OAUTH_REASON_CONFIG_MISSING)
    client_id, client_secret, configured_redirect_uri = google_cfg
    redirect_uri = _resolve_google_redirect_uri(configured_redirect_uri, request)

    try:
        token_response = requests.post(
            _GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
        token_response.raise_for_status()
        access_token = token_response.json().get("access_token")
        if not access_token:
            app_logger.warning("Google OAuth token response missing access token.")
            return _failure(_GOOGLE_OAUTH_REASON_EXCHANGE_FAILED)

        user_info_response = requests.get(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        user_info_response.raise_for_status()
        user_info = user_info_response.json()
    except Exception as exc:
        app_logger.warning(f"Google OAuth exchange failed: {exc}")
        return _failure(_GOOGLE_OAUTH_REASON_EXCHANGE_FAILED)

    email = str(user_info.get("email", "")).strip().lower()
    google_subject = str(user_info.get("sub", "")).strip()
    email_verified = bool(user_info.get("email_verified"))
    if not email or not email_verified or not google_subject:
        app_logger.warning("Google OAuth user info missing verified email.")
        return _failure(_GOOGLE_OAUTH_REASON_UNVERIFIED_EMAIL)

    if is_link_flow:
        target_user = UserModel.get_by_id(link_user_id or "")
        if not target_user:
            app_logger.warning("Google link flow failed: target user not found.")
            return _failure()

        existing_google_user = UserModel.get_by_google_subject(google_subject)
        existing_google_email_user = UserModel.get_by_google_email(email)
        is_linked_elsewhere = (
            (existing_google_user is not None and existing_google_user.id != target_user.id)
            or (existing_google_email_user is not None and existing_google_email_user.id != target_user.id)
        )
        if is_linked_elsewhere:
            app_logger.warning("Google link flow failed: account already linked to another user.")
            already_linked_response = RedirectResponse(
                url=_url_with_query_value(
                    link_failure_redirect,
                    "google_link_reason",
                    _GOOGLE_LINK_REASON_ALREADY_LINKED,
                ),
                status_code=307,
            )
            CookieUtils.delete_cookie(already_linked_response, _GOOGLE_OAUTH_STATE_COOKIE)
            CookieUtils.delete_cookie(already_linked_response, _GOOGLE_OAUTH_LINK_USER_COOKIE)
            return already_linked_response

        linked_user = target_user.link_google_account(google_subject, email)
        if not linked_user:
            app_logger.warning("Google link flow failed: unable to persist Google link.")
            return _failure()

        success_response = RedirectResponse(url=link_success_redirect, status_code=307)
        CookieUtils.delete_cookie(success_response, _GOOGLE_OAUTH_STATE_COOKIE)
        CookieUtils.delete_cookie(success_response, _GOOGLE_OAUTH_LINK_USER_COOKIE)
        app_logger.info(f"Google account linked for user_id={linked_user.id}")
        return success_response

    user = UserModel.get_by_google_subject(google_subject)
    if not user:
        by_email = UserModel.get_by_email(email)
        if by_email:
            if by_email.google_subject and by_email.google_subject != google_subject:
                app_logger.warning(
                    f"Google OAuth login blocked: email collision with different subject for email={email}"
                )
                return _failure(_GOOGLE_OAUTH_REASON_EMAIL_CONFLICT)
            had_google_subject = bool(by_email.google_subject)
            linked_user = by_email.link_google_account(google_subject, email)
            user = linked_user or by_email
            if not had_google_subject and linked_user:
                oauth_notice = _GOOGLE_OAUTH_NOTICE_LINKED_EXISTING_EMAIL
        else:
            user = UserModel.create(
                username=build_unique_username("pilot"),
                email=email,
                password=None,
                google_subject=google_subject,
                google_email=email,
            )
            if not user:
                app_logger.warning(f"Google OAuth user creation failed for email={email}")
                return _failure(_GOOGLE_OAUTH_REASON_CREATE_FAILED)
    elif user.google_email != email:
        user = user.link_google_account(google_subject, email) or user

    success_url = success_redirect
    if oauth_notice:
        success_url = _url_with_query_value(success_url, "oauth_notice", oauth_notice)

    success_response = RedirectResponse(url=success_url, status_code=307)
    JWTService.create_and_set_tokens(success_response, str(user.id))
    Csrf.clear_anon_csrf(success_response)
    CookieUtils.delete_cookie(success_response, _GOOGLE_OAUTH_STATE_COOKIE)
    CookieUtils.delete_cookie(success_response, _GOOGLE_OAUTH_LINK_USER_COOKIE)
    app_logger.info(f"Google OAuth login successful for email={email}")
    return success_response


@auth_routes.post("/google/unlink", status_code=HttpStatus.OK, response_model=UserResponse)
def google_unlink(request: Request):
    """
    Unlink the Google account from the authenticated user.
    Requires: access JWT cookies + X-CSRF-TOKEN matching csrf_access_token.
    """
    claims = JWTService.require_access(request)
    user_id = claims.get("sub")
    if not user_id:
        raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

    user = UserModel.get_by_id(user_id)
    if not user:
        raise NotFoundError(ResponseMessages.USER_NOT_FOUND)
    if not user.google_subject:
        public_user = to_public_user(user)
        return JSONResponse(
            {"user": public_user.model_dump(mode="json", by_alias=True)},
            status_code=HttpStatus.OK,
        )

    updated = user.unlink_google_account()
    if not updated:
        raise DomainValidationError(ResponseMessages.OAUTH_FAILED)

    app_logger.info(f"Google account unlinked for user_id={user_id}")
    public_user = to_public_user(updated)
    return JSONResponse(
        {"user": public_user.model_dump(mode="json", by_alias=True)},
        status_code=HttpStatus.OK,
    )


@auth_routes.get("/me", status_code=HttpStatus.OK, response_model=UserResponse)
def get_me(request: Request):
    """
    Return the authenticated user's data (sans password).
    Requires: JWT cookies + X-CSRF-TOKEN matching csrf_access_token.
    """
    claims = JWTService.require_access(request)
    user_id = claims.get("sub")
    if not user_id:
        raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

    user = UserModel.get_by_id(user_id)
    if not user:
        raise NotFoundError(ResponseMessages.USER_NOT_FOUND)

    app_logger.info(f"/me fetched for user_id={user_id}")
    public_user = to_public_user(user)
    return JSONResponse(
        {"user": public_user.model_dump(mode="json", by_alias=True)},
        status_code=HttpStatus.OK,
    )


@auth_routes.patch("/me/username", status_code=HttpStatus.OK, response_model=UserResponse)
def update_me_username(payload: UpdateUsernameRequest, request: Request):
    """
    Update the authenticated user's in-game username.
    Requires: access JWT cookies + X-CSRF-TOKEN matching csrf_access_token.
    """
    claims = JWTService.require_access(request)
    user_id = claims.get("sub")
    if not user_id:
        raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

    user = UserModel.get_by_id(user_id)
    if not user:
        raise NotFoundError(ResponseMessages.USER_NOT_FOUND)

    updated = user.update_username(payload.username)
    if not updated:
        raise ConflictError(ResponseMessages.USER_ALREADY_EXISTS)

    app_logger.info(f"Username updated for user_id={user_id}")
    public_user = to_public_user(updated)
    return JSONResponse(
        {"user": public_user.model_dump(mode="json", by_alias=True)},
        status_code=HttpStatus.OK,
    )


@auth_routes.post("/refresh", status_code=HttpStatus.OK)
def refresh_access_token(request: Request):
    """
    Issue a new access token (stateless refresh).
    Requires: refresh token cookie + X-CSRF-TOKEN matching csrf_refresh_token.
    """
    claims = JWTService.require_refresh(request)
    user_id = claims.get("sub")
    if not user_id:
        raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)
    response = JSONResponse({"message": "Access token refreshed"}, status_code=HttpStatus.OK)
    JWTService.refresh_access_token(response, str(user_id))
    return response


@auth_routes.post("/logout", status_code=HttpStatus.OK)
def logout(request: Request):
    """
    Clear all JWT and CSRF cookies.
    Requires: JWT cookies + X-CSRF-TOKEN matching csrf_access_token.
    """
    JWTService.require_access(request)
    response = JSONResponse({"message": "Logged out"}, status_code=HttpStatus.OK)
    JWTService.clear_tokens(response)
    Csrf.clear_anon_csrf(response)
    app_logger.info("User logged out")
    return response
