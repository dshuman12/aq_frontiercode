"""Tests for nexusflow.db.connection.ConnectionPool."""

import pytest
import threading
import time

from nexusflow.db.connection import (
    Connection,
    ConnectionPool,
    ConnectionError,
    PoolExhaustedError,
)


class TestConnection:
    """Tests for the Connection object."""

    def test_new_connection_is_open(self):
        conn = Connection(1, "postgresql://test")
        assert conn.is_closed is False

    def test_close_marks_closed(self):
        conn = Connection(1, "postgresql://test")
        conn.close()
        assert conn.is_closed is True

    def test_execute_on_closed_raises(self):
        conn = Connection(1, "postgresql://test")
        conn.close()
        with pytest.raises(ConnectionError, match="closed"):
            conn.execute("SELECT 1")

    def test_execute_returns_mock_results(self):
        conn = Connection(1, "postgresql://test")
        conn.set_mock_results([{"id": 1, "name": "Alice"}])
        results = conn.execute("SELECT * FROM users")
        assert results == [{"id": 1, "name": "Alice"}]

    def test_ping_returns_true_when_open(self):
        conn = Connection(1, "postgresql://test")
        assert conn.ping() is True

    def test_ping_returns_false_when_closed(self):
        conn = Connection(1, "postgresql://test")
        conn.close()
        assert conn.ping() is False


class TestConnectionTransaction:
    """Tests for transaction operations."""

    def test_begin_and_commit(self):
        conn = Connection(1, "postgresql://test")
        conn.begin()
        assert conn.in_transaction is True
        conn.commit()
        assert conn.in_transaction is False

    def test_begin_and_rollback(self):
        conn = Connection(1, "postgresql://test")
        conn.begin()
        conn.rollback()
        assert conn.in_transaction is False

    def test_double_begin_raises(self):
        conn = Connection(1, "postgresql://test")
        conn.begin()
        with pytest.raises(ConnectionError, match="already in a transaction"):
            conn.begin()

    def test_commit_without_transaction_raises(self):
        conn = Connection(1, "postgresql://test")
        with pytest.raises(ConnectionError, match="No active transaction"):
            conn.commit()

    def test_savepoint_requires_transaction(self):
        conn = Connection(1, "postgresql://test")
        with pytest.raises(ConnectionError, match="active transaction"):
            conn.savepoint("sp1")

    def test_savepoint_and_rollback_to(self):
        conn = Connection(1, "postgresql://test")
        conn.begin()
        conn.savepoint("sp1")
        conn.savepoint("sp2")
        conn.rollback_to_savepoint("sp1")
        # sp2 should be removed, sp1 should also be removed
        assert "sp2" not in conn._savepoints
        assert "sp1" not in conn._savepoints

    def test_close_with_active_transaction_rolls_back(self):
        conn = Connection(1, "postgresql://test")
        conn.begin()
        conn.close()
        assert conn.in_transaction is False
        assert conn.is_closed is True


class TestConnectionPool:
    """Tests for ConnectionPool checkout/checkin."""

    def test_checkout_returns_connection(self, connection_pool):
        conn = connection_pool.checkout()
        assert isinstance(conn, Connection)
        assert conn.is_closed is False
        connection_pool.checkin(conn)

    def test_checkin_makes_connection_available(self, connection_pool):
        conn = connection_pool.checkout()
        connection_pool.checkin(conn)
        conn2 = connection_pool.checkout()
        assert conn2.id == conn.id
        connection_pool.checkin(conn2)

    def test_multiple_checkouts_create_new_connections(self, connection_pool):
        c1 = connection_pool.checkout()
        c2 = connection_pool.checkout()
        assert c1.id != c2.id
        connection_pool.checkin(c1)
        connection_pool.checkin(c2)

    def test_context_manager_checkout_checkin(self, connection_pool):
        with connection_pool.connection() as conn:
            assert isinstance(conn, Connection)
        # Connection should be back in pool

    def test_transaction_context_manager(self, connection_pool):
        with connection_pool.transaction() as conn:
            assert conn.in_transaction is True
        # After context, transaction committed, connection returned

    def test_transaction_rollback_on_exception(self, connection_pool):
        with pytest.raises(RuntimeError):
            with connection_pool.transaction() as conn:
                raise RuntimeError("simulate failure")
        # Connection should have been rolled back and returned

    def test_checkin_with_active_transaction_rolls_back(self, connection_pool):
        conn = connection_pool.checkout()
        conn.begin()
        connection_pool.checkin(conn)
        assert conn.in_transaction is False


class TestPoolExhaustion:
    """Tests for pool capacity and timeout."""

    def test_pool_exhaustion_raises(self):
        pool = ConnectionPool(
            dsn="postgresql://test",
            pool_size=1,
            pool_overflow=0,
            pool_timeout=1,
        )
        c1 = pool.checkout()
        with pytest.raises(PoolExhaustedError):
            pool.checkout()
        pool.checkin(c1)
        pool.close()

    def test_checkout_after_close_raises(self, connection_pool):
        connection_pool.close()
        with pytest.raises(ConnectionError, match="closed"):
            connection_pool.checkout()


class TestPoolHealthChecks:
    """Tests for connection health checking."""

    def test_closed_connection_replaced_on_checkout(self):
        pool = ConnectionPool(
            dsn="postgresql://test",
            pool_size=2,
            pool_overflow=0,
        )
        conn = pool.checkout()
        conn_id = conn.id
        conn.close()
        pool.checkin(conn)  # Returns closed conn to pool
        # Next checkout should skip the closed conn and create a new one
        conn2 = pool.checkout()
        assert conn2.id != conn_id
        pool.checkin(conn2)
        pool.close()

    def test_old_connection_recycled(self):
        pool = ConnectionPool(
            dsn="postgresql://test",
            pool_size=2,
            pool_overflow=0,
            max_conn_age=0,  # Immediately expire
        )
        conn = pool.checkout()
        pool.checkin(conn)
        # The old connection should be destroyed on next checkout
        conn2 = pool.checkout()
        assert conn2.id != conn.id
        pool.checkin(conn2)
        pool.close()

    def test_pool_stats(self, connection_pool):
        conn = connection_pool.checkout()
        stats = connection_pool._stats
        assert stats.total_checkouts >= 1
        connection_pool.checkin(conn)
        assert stats.total_checkins >= 1
