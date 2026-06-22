"""Database connection pooling with retry logic and health checking."""

from __future__ import annotations

import logging
import threading
import time
from collections import deque
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Generator, Optional

logger = logging.getLogger(__name__)


class ConnectionError(Exception):
    """Raised when a database connection cannot be established."""
    pass


class PoolExhaustedError(Exception):
    """Raised when no connections are available in the pool."""
    pass


@dataclass
class ConnectionStats:
    """Connection pool statistics."""
    total_connections: int = 0
    active_connections: int = 0
    idle_connections: int = 0
    total_checkouts: int = 0
    total_checkins: int = 0
    total_timeouts: int = 0
    total_errors: int = 0
    avg_checkout_time_ms: float = 0.0


class Connection:
    """
    Represents a database connection with basic lifecycle management.

    In production this would wrap a real DB driver connection (psycopg2, asyncpg, etc.).
    For the framework, we simulate the interface.
    """

    def __init__(self, conn_id: int, dsn: str) -> None:
        self._id = conn_id
        self._dsn = dsn
        self._created_at = time.time()
        self._last_used = time.time()
        self._in_transaction = False
        self._closed = False
        self._use_count = 0
        self._savepoints: list[str] = []
        self._results: list[Any] = []

    @property
    def id(self) -> int:
        return self._id

    @property
    def is_closed(self) -> bool:
        return self._closed

    @property
    def in_transaction(self) -> bool:
        return self._in_transaction

    @property
    def age(self) -> float:
        return time.time() - self._created_at

    @property
    def idle_time(self) -> float:
        return time.time() - self._last_used

    def execute(self, query: str, params: Optional[tuple] = None) -> list[dict[str, Any]]:
        """Execute a query and return results."""
        if self._closed:
            raise ConnectionError("Connection is closed")
        self._last_used = time.time()
        self._use_count += 1

        # Simulate query execution
        logger.debug(f"Conn[{self._id}] Execute: {query} params={params}")
        return self._results

    def begin(self) -> None:
        """Begin a transaction."""
        if self._in_transaction:
            raise ConnectionError("Connection already in a transaction")
        self._in_transaction = True
        logger.debug(f"Conn[{self._id}] BEGIN")

    def commit(self) -> None:
        """Commit the current transaction."""
        if not self._in_transaction:
            raise ConnectionError("No active transaction to commit")
        self._savepoints.clear()
        self._in_transaction = False
        logger.debug(f"Conn[{self._id}] COMMIT")

    def rollback(self) -> None:
        """Rollback the current transaction."""
        if not self._in_transaction:
            raise ConnectionError("No active transaction to rollback")
        self._savepoints.clear()
        self._in_transaction = False
        logger.debug(f"Conn[{self._id}] ROLLBACK")

    def savepoint(self, name: str) -> None:
        """Create a savepoint within the current transaction."""
        if not self._in_transaction:
            raise ConnectionError("Savepoints require an active transaction")
        self._savepoints.append(name)
        logger.debug(f"Conn[{self._id}] SAVEPOINT {name}")

    def rollback_to_savepoint(self, name: str) -> None:
        """Rollback to a named savepoint."""
        if name not in self._savepoints:
            raise ConnectionError(f"Savepoint '{name}' not found")
        # Remove this and all later savepoints
        idx = self._savepoints.index(name)
        self._savepoints = self._savepoints[:idx]
        logger.debug(f"Conn[{self._id}] ROLLBACK TO SAVEPOINT {name}")

    def close(self) -> None:
        """Close the connection."""
        if self._in_transaction:
            self.rollback()
        self._closed = True
        logger.debug(f"Conn[{self._id}] CLOSED")

    def ping(self) -> bool:
        """Check if connection is still alive."""
        return not self._closed

    def set_mock_results(self, results: list[dict[str, Any]]) -> None:
        """Set mock results for testing."""
        self._results = results


class ConnectionPool:
    """
    Connection pool with configurable size, overflow, and timeout.

    Connections are lazily created up to pool_size + pool_overflow.
    When all connections are in use and the pool is at max capacity,
    checkout will block up to pool_timeout seconds.

    BUG CANDIDATE #8: When a connection is checked out, used in a transaction,
    and the transaction fails (rollback), the connection is returned to the pool.
    But if caching is enabled and the transaction had read queries before the
    rollback, those cached results are NOT invalidated. A subsequent checkout
    of the same connection may serve stale cached data.
    """

    def __init__(
        self,
        dsn: str,
        pool_size: int = 5,
        pool_overflow: int = 10,
        pool_timeout: int = 30,
        max_conn_age: int = 3600,
        health_check_interval: int = 60,
    ) -> None:
        self._dsn = dsn
        self._pool_size = pool_size
        self._pool_overflow = pool_overflow
        self._pool_timeout = pool_timeout
        self._max_conn_age = max_conn_age
        self._health_check_interval = health_check_interval

        self._idle: deque[Connection] = deque()
        self._active: set[int] = set()
        self._all_connections: dict[int, Connection] = {}
        self._next_id = 0
        self._lock = threading.Lock()
        self._available = threading.Condition(self._lock)
        self._stats = ConnectionStats()
        self._closed = False

    def _create_connection(self) -> Connection:
        """Create a new database connection."""
        conn_id = self._next_id
        self._next_id += 1
        conn = Connection(conn_id, self._dsn)
        self._all_connections[conn_id] = conn
        self._stats.total_connections += 1
        return conn

    def checkout(self) -> Connection:
        """
        Get a connection from the pool.

        If no idle connections are available:
        - Create a new one if under max capacity
        - Block until one becomes available or timeout

        BUG: The health check (ping) happens AFTER the connection is removed from
        the idle pool. If ping fails, the connection is destroyed but the method
        doesn't retry - it raises an error instead of trying the next idle connection.
        """
        start_time = time.time()

        with self._available:
            while True:
                if self._closed:
                    raise ConnectionError("Pool is closed")

                # Try to get an idle connection
                while self._idle:
                    conn = self._idle.popleft()

                    # Health check
                    if not conn.ping() or conn.age > self._max_conn_age:
                        self._destroy_connection(conn)
                        continue

                    self._active.add(conn.id)
                    self._stats.active_connections = len(self._active)
                    self._stats.idle_connections = len(self._idle)
                    self._stats.total_checkouts += 1
                    return conn

                # No idle connections — can we create a new one?
                total = len(self._all_connections)
                max_total = self._pool_size + self._pool_overflow
                if total < max_total:
                    conn = self._create_connection()
                    self._active.add(conn.id)
                    self._stats.active_connections = len(self._active)
                    self._stats.total_checkouts += 1
                    return conn

                # Pool is full, wait
                elapsed = time.time() - start_time
                remaining = self._pool_timeout - elapsed
                if remaining <= 0:
                    self._stats.total_timeouts += 1
                    raise PoolExhaustedError(
                        f"No connections available after {self._pool_timeout}s"
                    )

                self._available.wait(timeout=remaining)

    def checkin(self, conn: Connection) -> None:
        """Return a connection to the pool."""
        with self._available:
            self._active.discard(conn.id)

            if conn.is_closed or conn.age > self._max_conn_age:
                self._destroy_connection(conn)
            elif conn.in_transaction:
                # Force rollback any uncommitted transaction
                try:
                    conn.rollback()
                except Exception:
                    self._destroy_connection(conn)
                    return
                self._idle.append(conn)
            else:
                self._idle.append(conn)

            self._stats.active_connections = len(self._active)
            self._stats.idle_connections = len(self._idle)
            self._stats.total_checkins += 1
            self._available.notify()

    @contextmanager
    def connection(self) -> Generator[Connection, None, None]:
        """Context manager for checkout/checkin."""
        conn = self.checkout()
        try:
            yield conn
        finally:
            self.checkin(conn)

    @contextmanager
    def transaction(self) -> Generator[Connection, None, None]:
        """Context manager for a database transaction."""
        conn = self.checkout()
        try:
            conn.begin()
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self.checkin(conn)

    def _destroy_connection(self, conn: Connection) -> None:
        """Destroy a connection and remove it from the pool."""
        conn.close()
        self._all_connections.pop(conn.id, None)

    def close(self) -> None:
        """Close the pool and all connections."""
        with self._available:
            self._closed = True
            for conn in list(self._all_connections.values()):
                conn.close()
            self._idle.clear()
            self._active.clear()
            self._all_connections.clear()
            self._available.notify_all()

    @property
    def stats(self) -> ConnectionStats:
        return self._stats

    @property
    def size(self) -> int:
        return len(self._all_connections)
