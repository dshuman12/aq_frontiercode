"""Shared test fixtures and configuration."""

import os
import sys
import pytest
import asyncio

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def app_config():
    """Minimal app configuration for testing."""
    return {
        "app": {"name": "test-app", "debug": True, "port": 9000},
        "auth": {
            "secret_key": "test-secret-key-for-jwt-signing-only",
            "algorithm": "HS256",
            "access_token_ttl": 300,
            "refresh_token_ttl": 3600,
            "session_ttl": 600,
            "max_sessions_per_user": 3,
        },
        "database": {
            "host": "localhost",
            "port": 5432,
            "name": "test_db",
            "pool_size": 2,
            "pool_overflow": 3,
        },
        "cache": {"enabled": True, "backend": "memory", "ttl": 60, "max_size": 100},
        "events": {"async_dispatch": False, "max_handlers_per_event": 10},
        "tasks": {"max_workers": 2, "max_retries": 2, "retry_backoff_base": 1.5},
        "plugins": {"enabled": True, "sandbox_enabled": False},
        "telemetry": {"metrics_enabled": True, "log_level": "DEBUG"},
    }


@pytest.fixture
def jwt_manager():
    """Pre-configured JWT manager for testing."""
    from nexusflow.auth.jwt import JWTManager
    return JWTManager(
        secret_key="test-secret-key-for-jwt",
        access_ttl=300,
        refresh_ttl=3600,
        clock_skew_tolerance=5,
    )


@pytest.fixture
def session_manager():
    """Pre-configured session manager for testing."""
    from nexusflow.auth.sessions import SessionManager
    return SessionManager(session_ttl=600, max_sessions_per_user=3)


@pytest.fixture
def permission_registry():
    """Permission registry with default roles for testing."""
    from nexusflow.auth.permissions import PermissionRegistry, Role, Action
    registry = PermissionRegistry()

    # Create basic roles
    admin = Role(name="admin")
    admin.add_permission("*", Action.ADMIN)
    registry.register_role(admin)

    editor = Role(name="editor", parent_roles=["viewer"])
    editor.add_permission("posts", Action.CREATE)
    editor.add_permission("posts", Action.UPDATE)
    editor.add_permission("posts", Action.DELETE)
    registry.register_role(editor)

    viewer = Role(name="viewer")
    viewer.add_permission("posts", Action.READ)
    viewer.add_permission("users.profile", Action.READ)
    registry.register_role(viewer)

    return registry


@pytest.fixture
def connection_pool():
    """Test connection pool."""
    from nexusflow.db.connection import ConnectionPool
    pool = ConnectionPool(dsn="postgresql://test:test@localhost/test", pool_size=2, pool_overflow=2)
    yield pool
    pool.close()


@pytest.fixture
def query_cache():
    """Test query cache."""
    from nexusflow.db.caching import QueryCache
    return QueryCache(max_size=50, default_ttl=30)
