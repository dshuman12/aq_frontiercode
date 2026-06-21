"""OAuth2 authorization code flow and provider integration."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import secrets
import time
import urllib.parse
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class OAuthError(Exception):
    """Base exception for OAuth-related errors."""
    pass


class OAuthState(Enum):
    PENDING = "pending"
    AUTHORIZED = "authorized"
    EXCHANGED = "exchanged"
    FAILED = "failed"
    EXPIRED = "expired"


@dataclass
class OAuthProvider:
    """Configuration for an OAuth2 provider."""
    name: str
    client_id: str
    client_secret: str
    authorize_url: str
    token_url: str
    userinfo_url: str
    scopes: list[str] = field(default_factory=lambda: ["openid", "profile", "email"])
    redirect_uri: str = ""
    pkce_enabled: bool = True

    def get_authorize_url(self, state: str, code_challenge: Optional[str] = None) -> str:
        """Build the authorization URL with query parameters."""
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "scope": " ".join(self.scopes),
            "state": state,
        }
        if code_challenge and self.pkce_enabled:
            params["code_challenge"] = code_challenge
            params["code_challenge_method"] = "S256"

        return f"{self.authorize_url}?{urllib.parse.urlencode(params)}"


@dataclass
class OAuthSession:
    """Tracks the state of an OAuth flow."""
    session_id: str
    provider_name: str
    state: OAuthState
    state_token: str
    code_verifier: Optional[str] = None
    authorization_code: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user_info: Optional[dict[str, Any]] = None
    created_at: float = 0.0
    expires_at: float = 0.0
    error: Optional[str] = None

    @property
    def is_expired(self) -> bool:
        return time.time() > self.expires_at

    @property
    def is_complete(self) -> bool:
        return self.state == OAuthState.EXCHANGED and self.user_info is not None


class OAuthManager:
    """
    Manages OAuth2 authorization code flows with PKCE support.
    """

    def __init__(
        self,
        providers: Optional[dict[str, OAuthProvider]] = None,
        session_ttl: int = 600,
    ) -> None:
        self._providers = providers or {}
        self._sessions: dict[str, OAuthSession] = {}
        self._session_ttl = session_ttl

    def register_provider(self, provider: OAuthProvider) -> None:
        """Register an OAuth provider."""
        self._providers[provider.name] = provider

    def get_provider(self, name: str) -> Optional[OAuthProvider]:
        return self._providers.get(name)

    def initiate_flow(self, provider_name: str) -> tuple[str, str]:
        """
        Start an OAuth flow. Returns (authorize_url, session_id).
        """
        provider = self._providers.get(provider_name)
        if not provider:
            raise OAuthError(f"Unknown OAuth provider: {provider_name}")

        # Generate state token
        state_token = secrets.token_urlsafe(32)

        # Generate PKCE challenge if enabled
        code_verifier = None
        code_challenge = None
        if provider.pkce_enabled:
            code_verifier = secrets.token_urlsafe(43)
            code_challenge = self._create_code_challenge(code_verifier)

        # Create session
        now = time.time()
        session_id = secrets.token_urlsafe(16)
        session = OAuthSession(
            session_id=session_id,
            provider_name=provider_name,
            state=OAuthState.PENDING,
            state_token=state_token,
            code_verifier=code_verifier,
            created_at=now,
            expires_at=now + self._session_ttl,
        )
        self._sessions[session_id] = session

        # Build authorize URL
        authorize_url = provider.get_authorize_url(state_token, code_challenge)

        return authorize_url, session_id

    def handle_callback(
        self,
        session_id: str,
        state_token: str,
        authorization_code: Optional[str] = None,
        error: Optional[str] = None,
    ) -> OAuthSession:
        """
        Handle the OAuth callback from the provider.
        """
        session = self._sessions.get(session_id)
        if not session:
            raise OAuthError("OAuth session not found")

        if session.is_expired:
            session.state = OAuthState.EXPIRED
            raise OAuthError("OAuth session expired")

        # Verify state token
        if session.state_token != state_token:
            session.state = OAuthState.FAILED
            session.error = "State token mismatch"
            raise OAuthError("Invalid state token")

        if error:
            session.state = OAuthState.FAILED
            session.error = error
            raise OAuthError(f"OAuth error: {error}")

        if not authorization_code:
            session.state = OAuthState.FAILED
            session.error = "No authorization code"
            raise OAuthError("No authorization code provided")

        session.authorization_code = authorization_code
        session.state = OAuthState.AUTHORIZED
        return session

    def exchange_code(self, session_id: str) -> dict[str, Any]:
        """
        Exchange the authorization code for tokens.

        Returns the token response (simulated — in production this would make
        an HTTP request to the provider's token endpoint).
        """
        session = self._sessions.get(session_id)
        if not session:
            raise OAuthError("OAuth session not found")

        if session.state != OAuthState.AUTHORIZED:
            raise OAuthError(f"Session in wrong state: {session.state.value}")

        if session.is_expired:
            session.state = OAuthState.EXPIRED
            raise OAuthError("Session expired before code exchange")

        # In production, this would make an HTTP POST to the provider's token_url
        # with the authorization code and code_verifier.
        # For now, return a mock response structure.
        token_response = {
            "access_token": secrets.token_urlsafe(32),
            "token_type": "Bearer",
            "expires_in": 3600,
            "refresh_token": secrets.token_urlsafe(32),
            "scope": " ".join(
                self._providers[session.provider_name].scopes
                if session.provider_name in self._providers
                else []
            ),
        }

        session.access_token = token_response["access_token"]
        session.refresh_token = token_response.get("refresh_token")
        session.state = OAuthState.EXCHANGED

        return token_response

    def cleanup_expired(self) -> int:
        """Remove expired OAuth sessions."""
        expired = [
            sid for sid, session in self._sessions.items()
            if session.is_expired or session.state in (OAuthState.FAILED, OAuthState.EXCHANGED)
        ]
        for sid in expired:
            del self._sessions[sid]
        return len(expired)

    @staticmethod
    def _create_code_challenge(verifier: str) -> str:
        """Create PKCE S256 code challenge from verifier."""
        digest = hashlib.sha256(verifier.encode("ascii")).digest()
        import base64
        return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
