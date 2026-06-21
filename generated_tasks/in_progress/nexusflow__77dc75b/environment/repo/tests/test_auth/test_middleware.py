"""Tests for nexusflow.auth.middleware.AuthMiddleware."""

import pytest

from nexusflow.auth.jwt import JWTManager, TokenType
from nexusflow.auth.middleware import (
    AuthMiddleware,
    RateLimiter,
    RequestContext,
    ResponseContext,
)
from nexusflow.auth.sessions import SessionManager
from nexusflow.auth.permissions import PermissionRegistry, Role, Action


@pytest.fixture
def auth_middleware(jwt_manager):
    return AuthMiddleware(
        jwt_manager=jwt_manager,
        excluded_paths=["/health", "/public/*"],
        require_auth=True,
    )


@pytest.fixture
def rate_limiter():
    return RateLimiter(requests_per_minute=10, burst_size=3)


class TestTokenExtraction:
    """Tests for extracting tokens from requests."""

    def test_extract_bearer_token(self, auth_middleware, jwt_manager):
        token = jwt_manager.create_token("user-1")
        ctx = RequestContext(
            path="/api/data",
            headers={"Authorization": f"Bearer {token}"},
        )
        result = auth_middleware.process_request(ctx)
        assert result is None  # No error response
        assert ctx.user is not None
        assert ctx.user.sub == "user-1"

    def test_extract_token_from_query_param(self, auth_middleware, jwt_manager):
        token = jwt_manager.create_token("user-1")
        ctx = RequestContext(
            path="/api/ws",
            query_params={"token": token},
        )
        result = auth_middleware.process_request(ctx)
        assert result is None
        assert ctx.is_authenticated

    def test_missing_token_returns_401(self, auth_middleware):
        ctx = RequestContext(path="/api/data")
        result = auth_middleware.process_request(ctx)
        assert result is not None
        assert result.status_code == 401
        assert "Authentication required" in result.error

    def test_invalid_bearer_format(self, auth_middleware):
        ctx = RequestContext(
            path="/api/data",
            headers={"Authorization": "Basic abc123"},
        )
        result = auth_middleware.process_request(ctx)
        assert result is not None
        assert result.status_code == 401

    def test_expired_token_returns_401(self, jwt_manager):
        middleware = AuthMiddleware(
            jwt_manager=JWTManager(
                secret_key="test-secret-key-for-jwt",
                clock_skew_tolerance=0,
            )
        )
        import time
        token = jwt_manager.create_token("user-1", custom_ttl=1)
        time.sleep(2)
        ctx = RequestContext(
            path="/api/data",
            headers={"Authorization": f"Bearer {token}"},
        )
        result = middleware.process_request(ctx)
        assert result is not None
        assert result.status_code == 401
        assert "expired" in result.error.lower()


class TestExcludedPaths:
    """Tests for paths excluded from authentication."""

    def test_health_endpoint_excluded(self, auth_middleware):
        ctx = RequestContext(path="/health")
        result = auth_middleware.process_request(ctx)
        assert result is None

    def test_wildcard_path_excluded(self, auth_middleware):
        ctx = RequestContext(path="/public/docs")
        result = auth_middleware.process_request(ctx)
        assert result is None

    def test_non_excluded_path_requires_auth(self, auth_middleware):
        ctx = RequestContext(path="/api/secret")
        result = auth_middleware.process_request(ctx)
        assert result is not None
        assert result.status_code == 401


class TestRateLimiting:
    """Tests for the RateLimiter."""

    def test_allows_initial_burst(self, rate_limiter):
        for _ in range(3):
            assert rate_limiter.check("client-1") is True

    def test_rejects_after_burst_exhausted(self, rate_limiter):
        for _ in range(3):
            rate_limiter.check("client-1")
        assert rate_limiter.check("client-1") is False

    def test_different_clients_independent(self, rate_limiter):
        for _ in range(3):
            rate_limiter.check("client-1")
        assert rate_limiter.check("client-2") is True

    def test_tokens_replenish_over_time(self):
        limiter = RateLimiter(requests_per_minute=60, burst_size=1)
        assert limiter.check("c1") is True
        assert limiter.check("c1") is False
        import time
        time.sleep(1.1)  # 60/min = 1/sec, so 1 token replenishes per second
        assert limiter.check("c1") is True

    def test_cleanup_stale_entries(self, rate_limiter):
        rate_limiter.check("old-client")
        removed = rate_limiter.cleanup(max_age=0)
        assert removed >= 1

    def test_rate_limited_request_returns_429(self, jwt_manager):
        limiter = RateLimiter(requests_per_minute=0, burst_size=0)
        # Seed an entry so it's tracked
        limiter._buckets["ip:127.0.0.1"] = (0.0, 0.0)
        middleware = AuthMiddleware(
            jwt_manager=jwt_manager,
            rate_limiter=limiter,
        )
        token = jwt_manager.create_token("user-1")
        ctx = RequestContext(
            path="/api/data",
            headers={"Authorization": f"Bearer {token}"},
        )
        result = middleware.process_request(ctx)
        assert result is not None
        assert result.status_code == 429


class TestPermissionChecks:
    """Tests for middleware permission checking."""

    def test_unauthenticated_returns_401(self, auth_middleware):
        ctx = RequestContext(path="/api/data")
        result = auth_middleware.check_permission(ctx, "posts", Action.READ)
        assert result.status_code == 401

    def test_no_permission_registry_allows_all(self, jwt_manager):
        middleware = AuthMiddleware(jwt_manager=jwt_manager, permission_registry=None)
        token = jwt_manager.create_token("user-1")
        ctx = RequestContext(
            path="/api/data",
            headers={"Authorization": f"Bearer {token}"},
        )
        middleware.process_request(ctx)
        result = middleware.check_permission(ctx, "posts", Action.DELETE)
        assert result is None  # Allowed


class TestRequestContext:
    """Tests for RequestContext utility methods."""

    def test_case_insensitive_header_lookup(self):
        ctx = RequestContext(headers={"Content-Type": "application/json"})
        assert ctx.get_header("content-type") == "application/json"

    def test_get_header_default(self):
        ctx = RequestContext()
        assert ctx.get_header("X-Missing", "fallback") == "fallback"

    def test_is_authenticated_default_false(self):
        ctx = RequestContext()
        assert ctx.is_authenticated is False

    def test_user_id_none_when_not_authenticated(self):
        ctx = RequestContext()
        assert ctx.user_id is None
