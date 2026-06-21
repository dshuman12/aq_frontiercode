"""Tests for nexusflow.auth.jwt.JWTManager."""

import time
import pytest

from nexusflow.auth.jwt import (
    JWTManager,
    TokenClaims,
    TokenError,
    TokenExpiredError,
    TokenInvalidError,
    TokenType,
)


class TestJWTManagerCreation:
    """Tests for token creation."""

    def test_create_access_token(self, jwt_manager):
        token = jwt_manager.create_token("user-1")
        assert isinstance(token, str)
        assert "." in token

    def test_create_refresh_token(self, jwt_manager):
        token = jwt_manager.create_token("user-1", token_type=TokenType.REFRESH)
        claims = jwt_manager.validate_token(token)
        assert claims.typ == "refresh"

    def test_token_contains_user_id(self, jwt_manager):
        token = jwt_manager.create_token("user-42")
        claims = jwt_manager.validate_token(token)
        assert claims.sub == "user-42"

    def test_token_contains_roles(self, jwt_manager):
        token = jwt_manager.create_token(
            "user-1", roles=["admin", "editor"]
        )
        claims = jwt_manager.validate_token(token)
        assert "admin" in claims.roles
        assert "editor" in claims.roles

    def test_token_contains_permissions(self, jwt_manager):
        token = jwt_manager.create_token(
            "user-1", permissions=["read:posts", "write:posts"]
        )
        claims = jwt_manager.validate_token(token)
        assert "read:posts" in claims.permissions

    def test_token_contains_metadata(self, jwt_manager):
        token = jwt_manager.create_token(
            "user-1", metadata={"org_id": "org-99"}
        )
        claims = jwt_manager.validate_token(token)
        assert claims.metadata["org_id"] == "org-99"

    def test_custom_ttl(self, jwt_manager):
        token = jwt_manager.create_token("user-1", custom_ttl=60)
        claims = jwt_manager.validate_token(token)
        assert claims.exp - claims.iat == 60

    def test_empty_secret_key_raises(self):
        with pytest.raises(ValueError, match="secret_key cannot be empty"):
            JWTManager(secret_key="")

    def test_token_has_jti(self, jwt_manager):
        token = jwt_manager.create_token("user-1")
        claims = jwt_manager.validate_token(token)
        assert claims.jti
        assert len(claims.jti) == 16

    def test_token_has_issuer(self, jwt_manager):
        token = jwt_manager.create_token("user-1")
        claims = jwt_manager.validate_token(token)
        assert claims.iss == "nexusflow"


class TestJWTManagerValidation:
    """Tests for token validation."""

    def test_valid_token_succeeds(self, jwt_manager):
        token = jwt_manager.create_token("user-1")
        claims = jwt_manager.validate_token(token)
        assert claims.sub == "user-1"

    def test_tampered_token_fails(self, jwt_manager):
        token = jwt_manager.create_token("user-1")
        # Flip a character in the signature portion
        parts = token.split(".")
        sig = parts[-1]
        tampered_sig = sig[:-1] + ("A" if sig[-1] != "A" else "B")
        tampered = ".".join(parts[:-1] + [tampered_sig])
        with pytest.raises(TokenInvalidError):
            jwt_manager.validate_token(tampered)

    def test_wrong_secret_fails(self, jwt_manager):
        token = jwt_manager.create_token("user-1")
        other_mgr = JWTManager(secret_key="wrong-key")
        with pytest.raises(TokenInvalidError):
            other_mgr.validate_token(token)

    def test_wrong_issuer_fails(self):
        mgr = JWTManager(secret_key="s", issuer="service-a")
        token = mgr.create_token("user-1")
        mgr2 = JWTManager(secret_key="s", issuer="service-b")
        with pytest.raises(TokenInvalidError, match="Invalid issuer"):
            mgr2.validate_token(token)

    def test_malformed_token_fails(self, jwt_manager):
        with pytest.raises((TokenInvalidError, TokenError)):
            jwt_manager.validate_token("not.a.valid.token")


class TestJWTManagerExpiration:
    """Tests for token expiration and clock skew."""

    def test_expired_token_raises(self, jwt_manager):
        token = jwt_manager.create_token("user-1", custom_ttl=1)
        time.sleep(2)
        # The clock skew tolerance is 5s so token is still valid within skew
        # Create a manager with 0 skew to force expiration
        strict = JWTManager(secret_key="test-secret-key-for-jwt", clock_skew_tolerance=0)
        with pytest.raises(TokenExpiredError):
            strict.validate_token(token)

    def test_clock_skew_tolerance(self, jwt_manager):
        # Token with 2s TTL, clock_skew=5s means it stays valid up to 7s
        token = jwt_manager.create_token("user-1", custom_ttl=2)
        time.sleep(3)
        # Should still be valid due to 5s clock skew
        claims = jwt_manager.validate_token(token)
        assert claims.sub == "user-1"

    def test_token_claims_is_expired_property(self, jwt_manager):
        token = jwt_manager.create_token("user-1", custom_ttl=1)
        claims = jwt_manager.validate_token(token)
        assert claims.is_expired is False
        time.sleep(2)
        assert claims.is_expired is True

    def test_remaining_ttl(self, jwt_manager):
        token = jwt_manager.create_token("user-1", custom_ttl=300)
        claims = jwt_manager.validate_token(token)
        assert 290 <= claims.remaining_ttl <= 300


class TestJWTManagerRevocation:
    """Tests for token revocation."""

    def test_revoke_by_token_string(self, jwt_manager):
        token = jwt_manager.create_token("user-1")
        jwt_manager.revoke_token(token)
        with pytest.raises(TokenInvalidError, match="revoked"):
            jwt_manager.validate_token(token)

    def test_revoke_by_jti(self, jwt_manager):
        token = jwt_manager.create_token("user-1")
        claims = jwt_manager.validate_token(token)
        jwt_manager.revoke_token(claims.jti)
        with pytest.raises(TokenInvalidError, match="revoked"):
            jwt_manager.validate_token(token)

    def test_cleanup_revoked_removes_expired(self, jwt_manager):
        token = jwt_manager.create_token("user-1", custom_ttl=1)
        jwt_manager.revoke_token(token)
        assert len(jwt_manager._revoked) == 1
        time.sleep(2)
        removed = jwt_manager.cleanup_revoked()
        assert removed == 1
        assert len(jwt_manager._revoked) == 0

    def test_non_revoked_token_unaffected(self, jwt_manager):
        t1 = jwt_manager.create_token("user-1")
        t2 = jwt_manager.create_token("user-2")
        jwt_manager.revoke_token(t1)
        # t2 should remain valid
        claims = jwt_manager.validate_token(t2)
        assert claims.sub == "user-2"


class TestJWTManagerRefresh:
    """Tests for token refresh flow."""

    def test_refresh_produces_new_pair(self, jwt_manager):
        refresh = jwt_manager.create_token("user-1", token_type=TokenType.REFRESH)
        new_access, new_refresh = jwt_manager.refresh_token(refresh)
        assert new_access != refresh
        assert new_refresh != refresh

    def test_refresh_preserves_user_id(self, jwt_manager):
        refresh = jwt_manager.create_token(
            "user-1", token_type=TokenType.REFRESH, roles=["admin"]
        )
        new_access, _ = jwt_manager.refresh_token(refresh)
        claims = jwt_manager.validate_token(new_access)
        assert claims.sub == "user-1"
        assert "admin" in claims.roles

    def test_refresh_revokes_old_token(self, jwt_manager):
        refresh = jwt_manager.create_token("user-1", token_type=TokenType.REFRESH)
        jwt_manager.refresh_token(refresh)
        with pytest.raises(TokenInvalidError, match="revoked"):
            jwt_manager.validate_token(refresh)

    def test_refresh_with_access_token_fails(self, jwt_manager):
        access = jwt_manager.create_token("user-1", token_type=TokenType.ACCESS)
        with pytest.raises(TokenInvalidError, match="non-refresh"):
            jwt_manager.refresh_token(access)


class TestTokenClaims:
    """Tests for the TokenClaims dataclass."""

    def test_to_dict_roundtrip(self):
        claims = TokenClaims(
            sub="user-1", typ="access", iat=1000, exp=2000,
            jti="abc123", roles=["admin"], metadata={"k": "v"},
        )
        d = claims.to_dict()
        assert d["sub"] == "user-1"
        assert d["roles"] == ["admin"]
        assert d["metadata"]["k"] == "v"

    def test_token_type_property(self):
        claims = TokenClaims(sub="u1", typ="refresh")
        assert claims.token_type == TokenType.REFRESH
