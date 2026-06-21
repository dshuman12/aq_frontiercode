"""Tests for nexusflow.auth.sessions.SessionManager."""

import time
import pytest

from nexusflow.auth.sessions import Session, SessionManager


class TestSessionCreation:
    """Tests for creating sessions."""

    def test_create_session_returns_session(self, session_manager):
        session = session_manager.create_session("user-1")
        assert isinstance(session, Session)
        assert session.user_id == "user-1"

    def test_create_session_with_custom_id(self, session_manager):
        session = session_manager.create_session("user-1", session_id="custom-id")
        assert session.session_id == "custom-id"

    def test_create_session_stores_ip_and_ua(self, session_manager):
        session = session_manager.create_session(
            "user-1", ip_address="10.0.0.1", user_agent="TestBrowser/1.0"
        )
        assert session.ip_address == "10.0.0.1"
        assert session.user_agent == "TestBrowser/1.0"

    def test_create_session_has_timestamps(self, session_manager):
        before = time.time()
        session = session_manager.create_session("user-1")
        after = time.time()
        assert before <= session.created_at <= after
        assert before <= session.last_active <= after

    def test_create_session_with_metadata(self, session_manager):
        session = session_manager.create_session(
            "user-1", metadata={"device": "mobile"}
        )
        assert session.metadata["device"] == "mobile"


class TestSessionRetrieval:
    """Tests for retrieving sessions."""

    def test_get_session_by_id(self, session_manager):
        session = session_manager.create_session("user-1", session_id="sid-1")
        retrieved = session_manager.get_session("sid-1")
        assert retrieved is not None
        assert retrieved.session_id == "sid-1"

    def test_get_nonexistent_session_returns_none(self, session_manager):
        assert session_manager.get_session("does-not-exist") is None

    def test_get_user_sessions(self, session_manager):
        session_manager.create_session("user-1", session_id="s1")
        session_manager.create_session("user-1", session_id="s2")
        sessions = session_manager.get_user_sessions("user-1")
        assert len(sessions) == 2

    def test_get_user_sessions_empty(self, session_manager):
        sessions = session_manager.get_user_sessions("nobody")
        assert sessions == []


class TestSessionExpiration:
    """Tests for session TTL and expiration."""

    def test_session_is_valid_when_fresh(self, session_manager):
        session = session_manager.create_session("user-1")
        assert session.is_valid is True
        assert session.is_expired is False

    def test_session_expires_after_ttl(self):
        mgr = SessionManager(session_ttl=1, max_sessions_per_user=5)
        session = mgr.create_session("user-1")
        time.sleep(1.5)
        assert session.is_expired is True
        assert session.is_valid is False

    def test_get_expired_session_returns_none(self):
        mgr = SessionManager(session_ttl=1, max_sessions_per_user=5)
        session = mgr.create_session("user-1", session_id="s1")
        time.sleep(1.5)
        assert mgr.get_session("s1") is None

    def test_cleanup_expired_removes_stale(self):
        mgr = SessionManager(session_ttl=1, max_sessions_per_user=5)
        mgr.create_session("user-1", session_id="s1")
        mgr.create_session("user-1", session_id="s2")
        time.sleep(1.5)
        removed = mgr.cleanup_expired()
        assert removed == 2


class TestSessionTouch:
    """Tests for touching (refreshing) sessions."""

    def test_touch_updates_last_active(self, session_manager):
        session = session_manager.create_session("user-1", session_id="s1")
        original_last_active = session.last_active
        time.sleep(0.1)
        session_manager.touch_session("s1")
        assert session.last_active > original_last_active

    def test_touch_nonexistent_returns_false(self, session_manager):
        assert session_manager.touch_session("nope") is False


class TestSessionInvalidation:
    """Tests for invalidating sessions."""

    def test_invalidate_session(self, session_manager):
        session_manager.create_session("user-1", session_id="s1")
        result = session_manager.invalidate_session("s1")
        assert result is True
        assert session_manager.get_session("s1") is None

    def test_invalidate_nonexistent_returns_false(self, session_manager):
        assert session_manager.invalidate_session("nope") is False

    def test_invalidate_all_user_sessions(self, session_manager):
        session_manager.create_session("user-1", session_id="s1")
        session_manager.create_session("user-1", session_id="s2")
        count = session_manager.invalidate_user_sessions("user-1")
        assert count == 2
        assert session_manager.get_user_sessions("user-1") == []

    def test_invalidated_session_is_not_valid(self, session_manager):
        session = session_manager.create_session("user-1")
        session.invalidate()
        assert session.is_valid is False


class TestSessionEviction:
    """Tests for per-user session limits and eviction."""

    def test_eviction_when_limit_reached(self):
        mgr = SessionManager(session_ttl=600, max_sessions_per_user=2)
        s1 = mgr.create_session("user-1", session_id="s1")
        s2 = mgr.create_session("user-1", session_id="s2")
        s3 = mgr.create_session("user-1", session_id="s3")
        # s1 should be evicted (oldest)
        assert mgr.get_session("s1") is None
        assert mgr.get_session("s3") is not None

    def test_eviction_invalidates_old_session(self):
        mgr = SessionManager(session_ttl=600, max_sessions_per_user=1)
        s1 = mgr.create_session("user-1", session_id="s1")
        s2 = mgr.create_session("user-1", session_id="s2")
        assert s1._invalidated is True

    def test_session_age_property(self, session_manager):
        session = session_manager.create_session("user-1")
        time.sleep(0.1)
        assert session.age >= 0.1
