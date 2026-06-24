"""HTTP middleware utilities.

This module ships a small collection of ASGI middleware classes that
handle cross-cutting concerns:

* :class:`RequestContextMiddleware` — assigns a request id, populates
  log context vars, and sets ``X-Request-ID`` response headers.
* :class:`AccessLogMiddleware` — logs an access record per request.
* :class:`SecurityHeadersMiddleware` — adds a baseline of hardening
  headers (HSTS, X-Frame-Options, …).
* :class:`RateLimitMiddleware` — token-bucket per-IP / per-user rate
  limiting backed by the configured cache.
* :class:`MaxRequestSizeMiddleware` — rejects bodies above the
  configured maximum.
* :func:`install_exception_handlers` — wires :class:`AppError`
  subclasses into FastAPI's exception handler machinery.
"""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable, Iterable
from typing import Any

from app.core.config import Settings, get_settings
from app.core.constants import (
    CORRELATION_ID_HEADER,
    RATE_LIMIT_HEADER,
    RATE_LIMIT_REMAINING_HEADER,
    RATE_LIMIT_RESET_HEADER,
    REQUEST_ID_HEADER,
    RETRY_AFTER_HEADER,
)
from app.core.exceptions import (
    AppError,
    PayloadTooLargeError,
    RateLimitError,
)
from app.core.logging import (
    get_logger,
    new_request_id,
    set_correlation_id,
    set_request_id,
    set_user_id,
)

try:  # pragma: no cover - optional during unit tests
    from fastapi import FastAPI, Request, Response
    from fastapi.responses import JSONResponse
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.types import ASGIApp
except Exception:  # pragma: no cover
    BaseHTTPMiddleware = object  # type: ignore[assignment, misc]
    FastAPI = object  # type: ignore[assignment, misc]
    Request = Any  # type: ignore[assignment, misc]
    Response = Any  # type: ignore[assignment, misc]
    ASGIApp = Any  # type: ignore[assignment, misc]

    class JSONResponse:  # type: ignore[no-redef]
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self.args = args
            self.kwargs = kwargs


_logger = get_logger("app.http")


# ---------------------------------------------------------------------------
# Request context / access logging
# ---------------------------------------------------------------------------


class RequestContextMiddleware(BaseHTTPMiddleware):  # type: ignore[misc]
    """Assigns a request id, propagates correlation id, and tags log context."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        incoming = request.headers.get(REQUEST_ID_HEADER)
        request_id = incoming or new_request_id()
        correlation_id = request.headers.get(CORRELATION_ID_HEADER) or request_id
        set_request_id(request_id)
        set_correlation_id(correlation_id)
        set_user_id(None)
        request.state.request_id = request_id
        request.state.correlation_id = correlation_id
        try:
            response = await call_next(request)
        finally:
            set_request_id(None)
            set_correlation_id(None)
            set_user_id(None)
        response.headers[REQUEST_ID_HEADER] = request_id
        response.headers[CORRELATION_ID_HEADER] = correlation_id
        return response


class AccessLogMiddleware(BaseHTTPMiddleware):  # type: ignore[misc]
    """Emit a single structured log line per HTTP request."""

    def __init__(self, app: ASGIApp, *, slow_request_threshold: float = 1.0) -> None:
        super().__init__(app)
        self.slow_request_threshold = slow_request_threshold

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration = (time.perf_counter() - start) * 1000
            _logger.exception(
                "request.error",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration, 2),
                },
            )
            raise
        duration = (time.perf_counter() - start) * 1000
        level = "warning" if duration > self.slow_request_threshold * 1000 else "info"
        getattr(_logger, level)(
            "request.complete",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": getattr(response, "status_code", None),
                "duration_ms": round(duration, 2),
                "client": getattr(request.client, "host", None),
            },
        )
        return response


# ---------------------------------------------------------------------------
# Security headers
# ---------------------------------------------------------------------------


class SecurityHeadersMiddleware(BaseHTTPMiddleware):  # type: ignore[misc]
    """Inject a baseline of security headers into every response."""

    DEFAULTS: dict[str, str] = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        "Cross-Origin-Opener-Policy": "same-origin",
    }

    def __init__(
        self,
        app: ASGIApp,
        *,
        hsts: bool = True,
        csp: str | None = None,
        extra_headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(app)
        self.hsts = hsts
        self.csp = csp
        self.extra_headers = extra_headers or {}

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        for name, value in self.DEFAULTS.items():
            response.headers.setdefault(name, value)
        if self.hsts:
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=63072000; includeSubDomains; preload",
            )
        if self.csp:
            response.headers.setdefault("Content-Security-Policy", self.csp)
        for name, value in self.extra_headers.items():
            response.headers[name] = value
        return response


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------


class _TokenBucket:
    """In-process token bucket used as a fallback when Redis is absent."""

    __slots__ = ("capacity", "rate_per_second", "tokens", "updated")

    def __init__(self, capacity: int, rate_per_second: float) -> None:
        self.capacity = capacity
        self.rate_per_second = rate_per_second
        self.tokens = float(capacity)
        self.updated = time.monotonic()

    def consume(self, cost: float = 1.0) -> tuple[bool, float]:
        now = time.monotonic()
        elapsed = now - self.updated
        self.updated = now
        self.tokens = min(float(self.capacity), self.tokens + elapsed * self.rate_per_second)
        if self.tokens >= cost:
            self.tokens -= cost
            return True, 0.0
        deficit = cost - self.tokens
        retry_after = deficit / self.rate_per_second
        return False, retry_after


class RateLimitMiddleware(BaseHTTPMiddleware):  # type: ignore[misc]
    """Per-client rate limiting based on the active settings."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        settings: Settings | None = None,
        exempt_paths: Iterable[str] = ("/healthz", "/readyz", "/metrics"),
    ) -> None:
        super().__init__(app)
        self.settings = settings or get_settings()
        self.exempt_paths = tuple(exempt_paths)
        self._buckets: dict[str, _TokenBucket] = {}

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if not self.settings.rate_limit_enabled:
            return await call_next(request)
        if any(request.url.path.startswith(p) for p in self.exempt_paths):
            return await call_next(request)
        identifier = self._client_identifier(request)
        capacity, rate = self._limits_for(request)
        bucket = self._buckets.get(identifier)
        if bucket is None or bucket.capacity != capacity:
            bucket = _TokenBucket(capacity=capacity, rate_per_second=rate)
            self._buckets[identifier] = bucket
        allowed, retry_after = bucket.consume()
        if not allowed:
            raise RateLimitError(
                "Rate limit exceeded — please slow down.",
                retry_after_seconds=retry_after,
            )
        response = await call_next(request)
        response.headers[RATE_LIMIT_HEADER] = str(capacity)
        response.headers[RATE_LIMIT_REMAINING_HEADER] = str(int(bucket.tokens))
        response.headers[RATE_LIMIT_RESET_HEADER] = str(
            int(time.time() + max(0.0, (capacity - bucket.tokens) / max(rate, 1e-6)))
        )
        return response

    def _client_identifier(self, request: Request) -> str:
        user = getattr(request.state, "user_id", None) or getattr(request.state, "principal", None)
        if user:
            return f"user:{user}"
        host = getattr(request.client, "host", None) if request.client else None
        return f"ip:{host or 'anonymous'}"

    def _limits_for(self, request: Request) -> tuple[int, float]:
        if getattr(request.state, "user_id", None):
            per_minute = self.settings.rate_limit_per_minute
        else:
            per_minute = self.settings.rate_limit_anonymous_per_minute
        capacity = max(1, self.settings.rate_limit_burst)
        rate = max(per_minute / 60.0, 1.0 / 60.0)
        return capacity, rate


# ---------------------------------------------------------------------------
# Body size cap
# ---------------------------------------------------------------------------


class MaxRequestSizeMiddleware(BaseHTTPMiddleware):  # type: ignore[misc]
    """Reject requests with a ``Content-Length`` exceeding the configured cap."""

    def __init__(self, app: ASGIApp, *, max_bytes: int) -> None:
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        length = request.headers.get("content-length")
        if length and length.isdigit() and int(length) > self.max_bytes:
            raise PayloadTooLargeError(
                f"Request body exceeds the maximum of {self.max_bytes} bytes."
            )
        return await call_next(request)


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------


def install_exception_handlers(app: FastAPI) -> None:  # pragma: no cover - I/O
    """Wire :class:`AppError` and validation handlers onto a FastAPI app."""

    from fastapi.exceptions import RequestValidationError
    from starlette.exceptions import HTTPException as StarletteHTTPException

    @app.exception_handler(AppError)
    async def _handle_app_error(request: Request, exc: AppError) -> Response:
        body = exc.to_dict()
        body.setdefault("request_id", getattr(request.state, "request_id", None))
        headers: dict[str, str] = {}
        if isinstance(exc, RateLimitError) and exc.retry_after_seconds:
            headers[RETRY_AFTER_HEADER] = str(int(exc.retry_after_seconds) or 1)
        _logger.warning(
            "app_error",
            extra={
                "code": exc.code,
                "status": exc.status_code,
                "message": exc.message,
            },
        )
        return JSONResponse(status_code=exc.status_code, content=body, headers=headers)

    @app.exception_handler(StarletteHTTPException)
    async def _handle_http_exc(request: Request, exc: StarletteHTTPException) -> Response:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": "http_error",
                "message": str(exc.detail),
                "status": exc.status_code,
                "request_id": getattr(request.state, "request_id", None),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def _handle_validation(request: Request, exc: RequestValidationError) -> Response:
        return JSONResponse(
            status_code=422,
            content={
                "code": "validation_error",
                "message": "Request validation failed.",
                "status": 422,
                "details": {"errors": exc.errors()},
                "request_id": getattr(request.state, "request_id", None),
            },
        )

    @app.exception_handler(Exception)
    async def _handle_unhandled(request: Request, exc: Exception) -> Response:
        _logger.exception("unhandled_exception")
        return JSONResponse(
            status_code=500,
            content={
                "code": "internal_error",
                "message": "An unexpected error occurred.",
                "status": 500,
                "request_id": getattr(request.state, "request_id", None),
            },
        )


__all__ = [
    "RequestContextMiddleware",
    "AccessLogMiddleware",
    "SecurityHeadersMiddleware",
    "RateLimitMiddleware",
    "MaxRequestSizeMiddleware",
    "install_exception_handlers",
]
