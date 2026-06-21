"""JWT token creation, validation, and refresh logic."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
import base64
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class TokenError(Exception):
    """Base exception for token-related errors."""
    pass


class TokenExpiredError(TokenError):
    """Raised when a token has expired."""
    pass


class TokenInvalidError(TokenError):
    """Raised when a token is malformed or signature is invalid."""
    pass


class TokenType(Enum):
    ACCESS = "access"
    REFRESH = "refresh"
    API_KEY = "api_key"


@dataclass
class TokenClaims:
    """Decoded JWT claims."""
    sub: str  # Subject (user ID)
    typ: str = "access"  # Token type
    iat: int = 0  # Issued at
    exp: int = 0  # Expiration
    jti: str = ""  # JWT ID (unique identifier)
    iss: str = "nexusflow"  # Issuer
    roles: list[str] = field(default_factory=list)
    permissions: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def is_expired(self) -> bool:
        """Check if token has expired."""
        return time.time() > self.exp

    @property
    def token_type(self) -> TokenType:
        return TokenType(self.typ)

    @property
    def remaining_ttl(self) -> int:
        """Seconds until expiration. Negative if expired."""
        return int(self.exp - time.time())

    def to_dict(self) -> dict[str, Any]:
        return {
            "sub": self.sub,
            "typ": self.typ,
            "iat": self.iat,
            "exp": self.exp,
            "jti": self.jti,
            "iss": self.iss,
            "roles": self.roles,
            "permissions": self.permissions,
            "metadata": self.metadata,
        }


class JWTManager:
    """
    Handles JWT token creation and validation using HMAC-SHA256.

    This is a lightweight implementation that doesn't depend on PyJWT
    for core operations, making it suitable for embedded use.
    """

    def __init__(
        self,
        secret_key: str,
        algorithm: str = "HS256",
        issuer: str = "nexusflow",
        access_ttl: int = 3600,
        refresh_ttl: int = 86400,
        clock_skew_tolerance: int = 30,
    ) -> None:
        if not secret_key:
            raise ValueError("JWT secret_key cannot be empty")

        self._secret_key = secret_key
        self._algorithm = algorithm
        self._issuer = issuer
        self._access_ttl = access_ttl
        self._refresh_ttl = refresh_ttl
        self._clock_skew = clock_skew_tolerance

        # Map of revoked JTIs to their expiration time
        self._revoked: dict[str, int] = {}

    def create_token(
        self,
        user_id: str,
        token_type: TokenType = TokenType.ACCESS,
        roles: Optional[list[str]] = None,
        permissions: Optional[list[str]] = None,
        metadata: Optional[dict[str, Any]] = None,
        custom_ttl: Optional[int] = None,
    ) -> str:
        """
        Create a signed JWT token.
        """
        now = int(time.time())

        if custom_ttl is not None:
            ttl = custom_ttl
        elif token_type == TokenType.REFRESH:
            ttl = self._refresh_ttl
        else:
            ttl = self._access_ttl

        # Generate JTI — unique token identifier
        jti_input = f"{user_id}:{now}:{token_type.value}"
        jti = hashlib.sha256(jti_input.encode()).hexdigest()[:16]

        claims = TokenClaims(
            sub=user_id,
            typ=token_type.value,
            iat=now,
            exp=now + ttl,
            jti=jti,
            iss=self._issuer,
            roles=roles or [],
            permissions=permissions or [],
            metadata=metadata or {},
        )

        return self._encode(claims)

    def validate_token(self, token: str) -> TokenClaims:
        """
        Validate and decode a JWT token.
        """
        claims = self._decode(token)

        # Check issuer
        if claims.iss != self._issuer:
            raise TokenInvalidError(f"Invalid issuer: expected '{self._issuer}', got '{claims.iss}'")

        # Check expiration with clock skew tolerance
        now = int(time.time())
        if now > claims.exp + self._clock_skew:
            raise TokenExpiredError(
                f"Token expired at {claims.exp}, current time is {now} "
                f"(tolerance: {self._clock_skew}s)"
            )

        # Check not-before (iat shouldn't be too far in the future)
        if claims.iat > now + self._clock_skew:
            raise TokenInvalidError(
                f"Token issued in the future: iat={claims.iat}, now={now}"
            )

        # Check revocation
        if claims.jti in self._revoked:
            raise TokenInvalidError(f"Token has been revoked (jti={claims.jti})")

        return claims

    def revoke_token(self, token_or_jti: str) -> None:
        """Revoke a token by its JTI or by the full token string."""
        if "." in token_or_jti:
            # It's a full token, decode to get JTI
            claims = self._decode(token_or_jti)
            jti = claims.jti
            exp = claims.exp
        else:
            jti = token_or_jti
            exp = int(time.time()) + self._access_ttl  # Assume access token TTL

        self._revoked[jti] = exp

    def cleanup_revoked(self) -> int:
        """Remove expired entries from the revocation list. Returns count removed."""
        now = int(time.time())
        expired_jtis = [jti for jti, exp in self._revoked.items() if exp < now]
        for jti in expired_jtis:
            del self._revoked[jti]
        return len(expired_jtis)

    def refresh_token(self, refresh_token: str) -> tuple[str, str]:
        """
        Use a refresh token to generate a new access + refresh token pair.
        """
        claims = self.validate_token(refresh_token)

        if claims.token_type != TokenType.REFRESH:
            raise TokenInvalidError("Cannot refresh with a non-refresh token")

        # Create new pair
        new_access = self.create_token(
            user_id=claims.sub,
            token_type=TokenType.ACCESS,
            roles=claims.roles,
            permissions=claims.permissions,
            metadata=claims.metadata,
        )
        new_refresh = self.create_token(
            user_id=claims.sub,
            token_type=TokenType.REFRESH,
            roles=claims.roles,
            permissions=claims.permissions,
            metadata=claims.metadata,
        )

        # Revoke old refresh token
        self.revoke_token(refresh_token)

        return new_access, new_refresh

    def _encode(self, claims: TokenClaims) -> str:
        """Encode claims into a JWT string."""
        header = {"alg": self._algorithm, "typ": "JWT"}
        header_b64 = self._b64encode(json.dumps(header, separators=(",", ":")))
        payload_b64 = self._b64encode(json.dumps(claims.to_dict(), separators=(",", ":")))

        signing_input = f"{header_b64}.{payload_b64}"
        signature = self._sign(signing_input)
        signature_b64 = self._b64encode(signature)

        return f"{header_b64}.{payload_b64}.{signature_b64}"

    def _decode(self, token: str) -> TokenClaims:
        """Decode and verify a JWT string."""
        parts = token.split(".")
        if len(parts) != 3:
            raise TokenInvalidError("Token must have 3 parts separated by dots")

        header_b64, payload_b64, signature_b64 = parts

        # Verify signature
        signing_input = f"{header_b64}.{payload_b64}"
        expected_sig = self._sign(signing_input)
        actual_sig = self._b64decode(signature_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            raise TokenInvalidError("Invalid token signature")

        # Decode payload
        try:
            payload = json.loads(self._b64decode(payload_b64).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            raise TokenInvalidError(f"Invalid token payload: {e}")

        return TokenClaims(
            sub=payload.get("sub", ""),
            typ=payload.get("typ", "access"),
            iat=payload.get("iat", 0),
            exp=payload.get("exp", 0),
            jti=payload.get("jti", ""),
            iss=payload.get("iss", ""),
            roles=payload.get("roles", []),
            permissions=payload.get("permissions", []),
            metadata=payload.get("metadata", {}),
        )

    def _sign(self, data: str) -> bytes:
        """Create HMAC signature."""
        return hmac.new(
            self._secret_key.encode("utf-8"),
            data.encode("utf-8"),
            hashlib.sha256,
        ).digest()

    @staticmethod
    def _b64encode(data: str | bytes) -> str:
        """URL-safe base64 encode without padding."""
        if isinstance(data, str):
            data = data.encode("utf-8")
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

    @staticmethod
    def _b64decode(data: str) -> bytes:
        """URL-safe base64 decode with padding restoration."""
        padding = 4 - len(data) % 4
        if padding != 4:
            data += "=" * padding
        return base64.urlsafe_b64decode(data)
# Add token rotation
