"""
Authentication routes module.

This module defines all authentication-related routes including user registration,
login, logout, password reset, and OAuth integration with proper error handling
and business logic separation.
"""
from __future__ import annotations

from secrets import token_urlsafe

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, RedirectResponse

from server.application.user.email_verification import (
    build_verify_url,
    generate_verification_token,
    hash_verification_token,
    is_cooldown_elapsed,
    is_expired,
    utc_now,
    verification_expiry,
)
from server.utils.constants import (
    ResponseMessages, HttpStatus, TokenExpiry
)
from server.utils.error_handlers import (
    DomainValidationError,
    AuthenticationError,
    NotFoundError,
    AuthorizationError,
)
from server.external.db.models.user import User as UserModel
from server.external.services.email_service import EmailService
from server.application.user.login_user import login_user as userServiceLogin
from server.application.user.register_user import register_user as userServiceRegister
from server.api.security.csrf import Csrf, verify_anon_csrf
from server.api.security.jwt import JWTService
from server.api.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    ResendVerificationRequest,
    UserResponse,
    RegisterResponse,
)
from server.api.schemas.user import to_public_user
from server.config import get_app_config
from server.utils.logging import get_app_logger
app_logger = get_app_logger()

# Create router
auth_routes = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# CSRF token (anonymous)
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

# Register (anonymous CSRF required, no auto-login)
@auth_routes.post(
    "/register",
    status_code=HttpStatus.CREATED,
    response_model=RegisterResponse,
    dependencies=[Depends(verify_anon_csrf)],
)
def register_user(
    payload: RegisterRequest,
):
    """
    Create a new user, issue email verification token, and return user data.
    Requires: email + password + first_name + last_name in body, anonymous CSRF token in header.
    """
    user = userServiceRegister(payload.model_dump())
    if not user:
        raise DomainValidationError(ResponseMessages.REGISTRATION_FAILED)

    public_user = to_public_user(user)
    response = JSONResponse(
        {
            "message": ResponseMessages.VERIFY_EMAIL_REQUIRED,
            "user": public_user.model_dump(mode="json", by_alias=True),
        },
        status_code=HttpStatus.CREATED,
    )
    app_logger.info(f"User registered (pending verification): email={user.email}")
    return response

@auth_routes.post(
    "/login",
    status_code=HttpStatus.OK,
    response_model=UserResponse,
    dependencies=[Depends(verify_anon_csrf)],
)
def login_user(payload: LoginRequest):
    """
    Verify credentials, set JWT cookies, return user data (sans password).
    Requires: email + password in body, anonymous CSRF token in header.
    """
    user = userServiceLogin(
        identifier=payload.email.strip().lower(),
        password=payload.password
    )
    if not user:
        app_logger.warning(f"Login failed for email={payload.email}")
        raise AuthenticationError(ResponseMessages.INVALID_CREDENTIALS)
    if not user.is_verified:
        app_logger.info(f"Blocked login for unverified email={payload.email}")
        raise AuthorizationError(ResponseMessages.EMAIL_NOT_VERIFIED)

    public_user = to_public_user(user)
    response = JSONResponse(
        {"user": public_user.model_dump(mode="json", by_alias=True)},
        status_code=HttpStatus.OK,
    )
    JWTService.create_and_set_tokens(response, str(user.id))

    # Remove anonymous CSRF once authenticated
    Csrf.clear_anon_csrf(response)

    app_logger.info(f"User logged in: email={user.email}")
    return response


@auth_routes.get("/verify-email", status_code=HttpStatus.OK)
def verify_email(token: str):
    """
    Verify the email using the token, mark user as verified, and redirect.
    Requires: token as query parameter.
    """
    cfg = get_app_config()
    failure_redirect = cfg.FRONTEND_VERIFY_FAILURE_URL
    success_redirect = cfg.FRONTEND_VERIFY_SUCCESS_URL
    token_hash = hash_verification_token(token)
    user = UserModel.find_by_verification_token_hash(token_hash)
    if not user:
        app_logger.info("Email verification failed: token not found")
        return RedirectResponse(url=failure_redirect, status_code=307)

    if is_expired(user.email_verification_token_expires_at):
        user.clear_email_verification_token()
        app_logger.info(f"Email verification failed: expired token for user_id={user.id}")
        return RedirectResponse(url=failure_redirect, status_code=307)

    if not user.is_verified:
        user.mark_email_verified()
        app_logger.info(f"Email verified for user_id={user.id}")
    else:
        user.clear_email_verification_token()
        app_logger.info(f"Email already verified for user_id={user.id}")
    return RedirectResponse(url=success_redirect, status_code=307)


@auth_routes.post("/resend-verification", status_code=HttpStatus.OK, dependencies=[Depends(verify_anon_csrf)])
def resend_verification_email(payload: ResendVerificationRequest):
    """
    Always returns 200 with generic message to prevent email enumeration.
    Requires: email in body, anonymous CSRF token in header.
    """
    response = JSONResponse(
        {"message": ResponseMessages.VERIFICATION_EMAIL_GENERIC_SENT},
        status_code=HttpStatus.OK,
    )

    user = UserModel.get_by_email(payload.email)
    if not user:
        return response
    if user.is_verified:
        return response
    if not is_cooldown_elapsed(
        user.last_verification_email_sent_at,
        TokenExpiry.VERIFICATION_EMAIL_COOLDOWN_SECONDS,
    ):
        return response

    raw_token = generate_verification_token()
    token_hash = hash_verification_token(raw_token)
    expires_at = verification_expiry()
    user.set_email_verification_token(token_hash, expires_at)
    verify_url = build_verify_url(raw_token)

    try:
        EmailService.send_verification_email(user.email, user.username, verify_url)
        user.set_last_verification_email_sent_at(utc_now())
        app_logger.info(f"Resent verification email for user_id={user.id}")
    except Exception as exc:
        app_logger.warning(f"Failed to resend verification email for user_id={user.id}: {exc}")

    return response

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
    # Also clear anon CSRF (no harm if absent)
    Csrf.clear_anon_csrf(response)
    app_logger.info("User logged out")
    return response
