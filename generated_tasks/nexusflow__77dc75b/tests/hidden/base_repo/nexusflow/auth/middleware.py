"""Authentication middleware for request processing pipeline."""

from __future__ import annotations

import hashlib
import logging
import time
import threading
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from nexusflow.auth.jwt import JWTManager, TokenClaims, TokenError, TokenExpiredError
from nexusflow.auth.permissions import PermissionRegistry, Action, PermissionDeniedError
from nexusflow.auth.sessions import SessionManager, Session

logger = logging.getLogger(__name__)


@dataclass
class RequestContext:
    """Context object passed through the middleware chain."""
    method: str = "GET"
    path: str = "/"
    headers: dict[str, str] = field(default_factory=dict)
    query_params: dict[str, str] = field(default_factory=dict)
    body: Optional[bytes] = None
    client_ip: str = "127.0.0.1"
    user: Optional[TokenClaims] = None
    session: Optional[Session] = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def is_authenticated(self) -> bool:
        return self.user is not None

    @property
    def user_id(self) -> Optional[str]:
        return self.user.sub if self.user else None

    def get_header(self, name: str, default: str = "") -> str:
        """Case-insensitive header lookup."""
        name_lower = name.lower()
        for key, value in self.headers.items():
            if key.lower() == name_lower:
                return value
        return default


@dataclass
class ResponseContext:
    """Response object returned by handlers."""
    status_code: int = 200
    headers: dict[str, str] = field(default_factory=dict)
    body: Any = None
    error: Optional[str] = None


class RateLimiter:
    """
    Token bucket rate limiter with per-client tracking.

    BUG CANDIDATE #1 (related): The rate limiter uses client_ip as the key,
    but when behind a proxy, the client_ip might be the proxy's IP. The
    X-Forwarded-For header should be checked, but the current implementation
    doesn't handle chained proxies (multiple IPs in X-Forwarded-For).
    """

    def __init__(
        self,
        requests_per_minute: int = 60,
        burst_size: int = 10,
    ) -> None:
        self._rate = requests_per_minute / 60.0  # tokens per second
        self._burst_size = burst_size
        self._buckets: dict[str, tuple[float, float]] = {}  # key -> (tokens, last_update)
        self._lock = threading.Lock()

    def check(self, key: str) -> bool:
        """
        Check if a request is allowed under the rate limit.
        Returns True if allowed, False if rate-limited.
        """
        now = time.time()

        with self._lock:
            if key not in self._buckets:
                self._buckets[key] = (self._burst_size - 1, now)
                return True

            tokens, last_update = self._buckets[key]

            # Add tokens based on elapsed time
            elapsed = now - last_update
            tokens = min(self._burst_size, tokens + elapsed * self._rate)

            if tokens >= 1:
                self._buckets[key] = (tokens - 1, now)
                return True
            else:
                self._buckets[key] = (tokens, now)
                return False

    def cleanup(self, max_age: float = 3600) -> int:
        """Remove stale bucket entries. Returns count removed."""
        now = time.time()
        with self._lock:
            stale = [k for k, (_, ts) in self._buckets.items() if now - ts > max_age]
            for k in stale:
                del self._buckets[k]
            return len(stale)


class AuthMiddleware:
    """
    Authentication middleware that validates tokens, manages sessions,
    and enforces rate limits.

    BUG CANDIDATE #18 (related): The middleware reads the JWT secret key
    during initialization but doesn't re-read it when secrets are rotated.
    If the secret key changes at runtime (via SecretsManager), the middleware
    continues using the old key, rejecting all tokens signed with the new key.
    """

    def __init__(
        self,
        jwt_manager: JWTManager,
        session_manager: Optional[SessionManager] = None,
        permission_registry: Optional[PermissionRegistry] = None,
        rate_limiter: Optional[RateLimiter] = None,
        excluded_paths: Optional[list[str]] = None,
        require_auth: bool = True,
    ) -> None:
        self._jwt = jwt_manager
        self._sessions = session_manager
        self._permissions = permission_registry
        self._rate_limiter = rate_limiter
        self._excluded_paths = set(excluded_paths or ["/health", "/metrics", "/openapi.json"])
        self._require_auth = require_auth

    def process_request(self, ctx: RequestContext) -> Optional[ResponseContext]:
        """
        Process an incoming request through the auth pipeline.
        Returns None if the request should proceed, or a ResponseContext to short-circuit.
        """
        # Check exclusions
        if self._is_excluded(ctx.path):
            return None

        # Rate limiting
        if self._rate_limiter:
            client_key = self._get_rate_limit_key(ctx)
            if not self._rate_limiter.check(client_key):
                return ResponseContext(
                    status_code=429,
                    error="Rate limit exceeded",
                    headers={"Retry-After": "60"},
                )

        # Token authentication
        token = self._extract_token(ctx)
        if token:
            try:
                claims = self._jwt.validate_token(token)
                ctx.user = claims

                # Session validation
                if self._sessions:
                    session = self._sessions.get_session(claims.jti)
                    if session and session.is_valid:
                        ctx.session = session
                        self._sessions.touch_session(claims.jti)
                    elif self._sessions and not session:
                        # Token is valid but no active session
                        logger.warning(f"Valid token but no session for jti={claims.jti}")

            except TokenExpiredError:
                return ResponseContext(
                    status_code=401,
                    error="Token expired",
                    headers={"WWW-Authenticate": "Bearer error=\"token_expired\""},
                )
            except TokenError as e:
                return ResponseContext(
                    status_code=401,
                    error=str(e),
                    headers={"WWW-Authenticate": "Bearer error=\"invalid_token\""},
                )
        elif self._require_auth:
            return ResponseContext(
                status_code=401,
                error="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return None

    def check_permission(
        self, ctx: RequestContext, resource: str, action: Action
    ) -> Optional[ResponseContext]:
        """Check if the authenticated user has permission for an action."""
        if not ctx.is_authenticated:
            return ResponseContext(status_code=401, error="Not authenticated")

        if not self._permissions:
            return None  # No permission registry, allow all

        try:
            self._permissions.check_permission(ctx.user_id, resource, action)
            return None
        except PermissionDeniedError as e:
            return ResponseContext(status_code=403, error=str(e))

    def _extract_token(self, ctx: RequestContext) -> Optional[str]:
        """Extract JWT token from Authorization header or query parameter."""
        # Check Authorization header
        auth_header = ctx.get_header("Authorization")
        if auth_header:
            parts = auth_header.split(" ", 1)
            if len(parts) == 2 and parts[0].lower() == "bearer":
                return parts[1].strip()

        # Check query parameter (for WebSocket connections)
        return ctx.query_params.get("token")

    def _is_excluded(self, path: str) -> bool:
        """Check if a path is excluded from authentication."""
        return path in self._excluded_paths or any(
            path.startswith(excl.rstrip("*")) for excl in self._excluded_paths if excl.endswith("*")
        )

    def _get_rate_limit_key(self, ctx: RequestContext) -> str:
        """Get the rate limiting key for a request."""
        # Check for forwarded IP
        forwarded = ctx.get_header("X-Forwarded-For")
        if forwarded:
            # Take the first IP in the chain
            ip = forwarded.split(",")[0].strip()
        else:
            ip = ctx.client_ip

        # If authenticated, rate limit per user instead of per IP
        if ctx.is_authenticated:
            return f"user:{ctx.user_id}"
        return f"ip:{ip}"
