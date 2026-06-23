"""Behavioral tests for VaultKey auth backends."""
from __future__ import annotations

import time

import pytest

from vaultkey.access.auth import (
    AppRoleBackend,
    AuthConfigValidator,
    AuthEventLogger,
    AuthManager,
    AuthRateLimiter,
    AuthSessionManager,
    CertBackend,
    MultiFactorAuthChain,
    RateLimitConfig,
    TokenBackend,
    UserpassBackend,
)
from vaultkey.utils.errors import AuthenticationError


def test_userpass_backend_hashes_passwords_and_authenticates() -> None:
    backend = UserpassBackend()
    backend.create_user("alice", "correct-horse", policies=["dev", "ops"])

    assert backend.backend_type() == "userpass"
    assert backend.list_users() == ["alice"]

    result = backend.authenticate({"username": "alice", "password": "correct-horse"})
    assert result.entity_id.startswith("entity_")
    assert result.policies == ["dev", "ops"]
    assert result.metadata == {"username": "alice"}
    assert result.auth_backend == "userpass"
    assert result.ttl > 0
    assert result.to_dict()["policies"] == ["dev", "ops"]

    with pytest.raises(AuthenticationError):
        backend.authenticate({"username": "alice", "password": "wrong"})

    backend.update_password("alice", "new-secret")
    with pytest.raises(AuthenticationError):
        backend.authenticate({"username": "alice", "password": "correct-horse"})
    assert backend.authenticate({"username": "alice", "password": "new-secret"}).metadata[
        "username"
    ] == "alice"

    backend.disable()
    with pytest.raises(AuthenticationError):
        backend.authenticate({"username": "alice", "password": "new-secret"})
    backend.enable()
    assert backend.delete_user("alice") is True
    assert backend.delete_user("alice") is False


def test_approle_backend_requires_matching_role_and_secret() -> None:
    backend = AppRoleBackend()
    secret_id = backend.create_role("web", policies=["web-policy"])
    role_id = backend.get_role_id("web")

    assert backend.backend_type() == "approle"
    assert backend.list_roles() == ["web"]
    assert role_id.startswith("role_")

    with pytest.raises(AuthenticationError):
        backend.authenticate({"role_id": role_id})
    with pytest.raises(AuthenticationError):
        backend.authenticate({"role_id": role_id, "secret_id": "bad-secret"})

    result = backend.authenticate({"role_id": role_id, "secret_id": secret_id})
    assert result.policies == ["web-policy"]
    assert result.metadata == {"role_name": "web", "role_id": role_id}
    assert result.auth_backend == "approle"

    backend.create_role("batch", policies=["batch-policy"], bind_secret_id=False)
    batch_role_id = backend.get_role_id("batch")
    batch = backend.authenticate({"role_id": batch_role_id})
    assert batch.policies == ["batch-policy"]
    assert batch.metadata["role_name"] == "batch"

    assert backend.delete_role("web") is True
    with pytest.raises(AuthenticationError):
        backend.get_role_id("web")


def test_certificate_token_and_manager_backends() -> None:
    cert_backend = CertBackend()
    cert_backend.register_certificate("service-a", "sha256:abc123", policies=["svc"])
    cert_result = cert_backend.authenticate({"fingerprint": "sha256:abc123"})
    assert cert_backend.backend_type() == "cert"
    assert cert_backend.list_certificates() == ["service-a"]
    assert cert_result.policies == ["svc"]
    assert cert_result.metadata == {"cert_name": "service-a"}

    with pytest.raises(AuthenticationError):
        cert_backend.authenticate({"fingerprint": "sha256:missing"})

    token_backend = TokenBackend()
    token_backend.register_token("tok-value", "entity-1", ["read"])
    token_result = token_backend.authenticate({"token": "tok-value"})
    assert token_backend.backend_type() == "token"
    assert token_result.entity_id == "entity-1"
    assert token_result.policies == ["read"]
    assert token_backend.revoke_token("tok-value") is True
    with pytest.raises(AuthenticationError):
        token_backend.authenticate({"token": "tok-value"})

    userpass = UserpassBackend("local")
    userpass.create_user("bob", "pw", policies=["default"])
    manager = AuthManager()
    manager.register(userpass)
    assert manager.list_backends() == ["local"]
    assert manager.get("local") is userpass
    result = manager.authenticate("local", {"username": "bob", "password": "pw"})
    assert result.auth_backend == "local"
    with pytest.raises(AuthenticationError):
        manager.authenticate("missing", {})
    assert manager.unregister("local") is True


def test_auth_stateful_helpers_are_usable() -> None:
    limiter = AuthRateLimiter(RateLimitConfig(max_attempts=2, window_seconds=60, lockout_seconds=60))
    assert limiter.check_rate_limit("userpass:alice") is True
    limiter.record_attempt("userpass:alice", success=False)
    limiter.record_attempt("userpass:alice", success=False)
    assert limiter.is_locked_out("userpass:alice") is True
    assert limiter.check_rate_limit("userpass:alice") is False
    limiter.clear("userpass:alice")
    assert limiter.locked_out_count == 0

    sessions = AuthSessionManager(session_ttl=60, max_sessions=2)
    session = sessions.create_session("entity-1", "userpass", {"username": "alice"})
    assert sessions.get_session(session.session_id) is session
    assert sessions.active_count == 1
    assert sessions.revoke_session(session.session_id) is True
    assert sessions.get_session(session.session_id) is None
    assert sessions.tidy() == 1

    mfa = MultiFactorAuthChain()
    challenge = mfa.create_challenge("entity-1", "totp")
    assert mfa.verify_challenge("entity-1", challenge.challenge_id, "000000") is False
    assert mfa.verify_challenge("entity-1", challenge.challenge_id, challenge.code) is True
    assert mfa.is_fully_authenticated("entity-1") is True
    mfa.clear_challenges("entity-1")
    assert mfa.is_fully_authenticated("entity-1") is False

    logger = AuthEventLogger(max_entries=2)
    logger.log("userpass", "entity-1", True)
    logger.log("userpass", "entity-1", False, source_address="127.0.0.1", error="bad password")
    assert logger.total_entries == 2
    assert logger.failure_count("entity-1", since=time.time() - 10) == 1
    assert len(logger.get_entries(backend="userpass")) == 2

    validator = AuthConfigValidator()
    weak = validator.validate_userpass({"iterations": 5000})
    assert weak.valid is False
    assert weak.errors
    warning = validator.validate_approle({"bind_secret_id": False})
    assert warning.valid is True
    assert warning.warnings

