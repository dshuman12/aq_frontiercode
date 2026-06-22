"""Session management with TTL and per-user limits."""

from __future__ import annotations

import hashlib
import logging
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class Session:
    """Represents an active user session."""
    session_id: str
    user_id: str
    created_at: float
    last_active: float
    ttl: int  # seconds
    ip_address: str = ""
    user_agent: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    _invalidated: bool = False

    @property
    def is_valid(self) -> bool:
        """Check if session is still valid (not expired and not invalidated)."""
        if self._invalidated:
            return False
        return time.time() - self.last_active < self.ttl

    @property
    def is_expired(self) -> bool:
        return time.time() - self.last_active >= self.ttl

    @property
    def age(self) -> float:
        """Session age in seconds."""
        return time.time() - self.created_at

    def invalidate(self) -> None:
        self._invalidated = True

    def touch(self) -> None:
        """Update last active timestamp."""
        if not self._invalidated:
            self.last_active = time.time()


class SessionManager:
    """
    Manages user sessions with TTL-based expiration and per-user limits.

    When a user exceeds the max sessions limit, the oldest session is evicted.
    """

    def __init__(
        self,
        session_ttl: int = 7200,
        max_sessions_per_user: int = 5,
    ) -> None:
        self._ttl = session_ttl
        self._max_sessions = max_sessions_per_user
        self._sessions: dict[str, Session] = {}  # session_id -> Session
        self._user_sessions: dict[str, list[str]] = {}  # user_id -> [session_ids]
        self._lock = threading.Lock()

    def create_session(
        self,
        user_id: str,
        session_id: Optional[str] = None,
        ip_address: str = "",
        user_agent: str = "",
        metadata: Optional[dict[str, Any]] = None,
    ) -> Session:
        """
        Create a new session for a user.

        If the user already has max_sessions_per_user sessions, the oldest one is evicted.

        BUG CANDIDATE: When evicting the oldest session, we sort by last_active but
        the comparison uses <= instead of <. When two sessions have exactly the same
        last_active timestamp (possible if created in rapid succession), the sort is
        unstable and may evict the wrong session.
        """
        now = time.time()

        if session_id is None:
            session_id = self._generate_session_id(user_id, now)

        session = Session(
            session_id=session_id,
            user_id=user_id,
            created_at=now,
            last_active=now,
            ttl=self._ttl,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata or {},
        )

        with self._lock:
            # Check session limit
            self._enforce_session_limit(user_id)

            # Store session
            self._sessions[session_id] = session
            if user_id not in self._user_sessions:
                self._user_sessions[user_id] = []
            self._user_sessions[user_id].append(session_id)

        logger.debug(f"Created session {session_id} for user {user_id}")
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """Get a session by ID. Returns None if not found or expired."""
        session = self._sessions.get(session_id)
        if session is None:
            return None
        if session.is_expired or session._invalidated:
            self._remove_session(session_id)
            return None
        return session

    def touch_session(self, session_id: str) -> bool:
        """Update a session's last active time. Returns False if session not found."""
        session = self.get_session(session_id)
        if session:
            session.touch()
            return True
        return False

    def invalidate_session(self, session_id: str) -> bool:
        """Invalidate a specific session."""
        session = self._sessions.get(session_id)
        if session:
            session.invalidate()
            self._remove_session(session_id)
            return True
        return False

    def invalidate_user_sessions(self, user_id: str) -> int:
        """Invalidate all sessions for a user. Returns count invalidated."""
        with self._lock:
            session_ids = self._user_sessions.get(user_id, []).copy()
            count = 0
            for sid in session_ids:
                session = self._sessions.get(sid)
                if session:
                    session.invalidate()
                    count += 1
                self._sessions.pop(sid, None)
            self._user_sessions.pop(user_id, None)
            return count

    def get_user_sessions(self, user_id: str) -> list[Session]:
        """Get all active sessions for a user."""
        session_ids = self._user_sessions.get(user_id, [])
        sessions = []
        for sid in session_ids:
            session = self.get_session(sid)
            if session and session.is_valid:
                sessions.append(session)
        return sessions

    def cleanup_expired(self) -> int:
        """Remove all expired sessions. Returns count removed."""
        with self._lock:
            expired = [
                sid for sid, session in self._sessions.items()
                if session.is_expired or session._invalidated
            ]
            for sid in expired:
                self._remove_session_internal(sid)
            return len(expired)

    def _enforce_session_limit(self, user_id: str) -> None:
        """Evict oldest sessions if user exceeds the limit."""
        user_sids = self._user_sessions.get(user_id, [])
        if len(user_sids) >= self._max_sessions:
            # Sort by last_active, evict oldest
            active_sessions = []
            for sid in user_sids:
                session = self._sessions.get(sid)
                if session and not session._invalidated:
                    active_sessions.append((sid, session.last_active))

            active_sessions.sort(key=lambda x: x[1])

            # Evict oldest sessions until under limit
            while len(active_sessions) >= self._max_sessions:
                evict_sid, _ = active_sessions.pop(0)
                session = self._sessions.get(evict_sid)
                if session:
                    session.invalidate()
                self._remove_session_internal(evict_sid)
                logger.debug(f"Evicted session {evict_sid} for user {user_id} (limit reached)")

    def _remove_session(self, session_id: str) -> None:
        """Remove a session (thread-safe)."""
        with self._lock:
            self._remove_session_internal(session_id)

    def _remove_session_internal(self, session_id: str) -> None:
        """Remove a session (must hold lock)."""
        session = self._sessions.pop(session_id, None)
        if session:
            user_sids = self._user_sessions.get(session.user_id, [])
            if session_id in user_sids:
                user_sids.remove(session_id)
            if not user_sids:
                self._user_sessions.pop(session.user_id, None)

    def _generate_session_id(self, user_id: str, timestamp: float) -> str:
        """Generate a unique session ID."""
        import os
        random_bytes = os.urandom(16)
        data = f"{user_id}:{timestamp}:{random_bytes.hex()}"
        return hashlib.sha256(data.encode()).hexdigest()[:32]

    @property
    def active_session_count(self) -> int:
        return len(self._sessions)

    @property
    def active_user_count(self) -> int:
        return len(self._user_sessions)
# Fix session cleanup
