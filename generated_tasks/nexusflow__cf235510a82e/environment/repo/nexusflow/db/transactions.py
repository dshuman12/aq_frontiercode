"""
nexusflow.db.transactions
~~~~~~~~~~~~~~~~~~~~~~~~~

Transaction manager with savepoints and nested transactions support.
Provides ACID-like semantics with automatic rollback on failure and
savepoint management for partial rollback scenarios.

BUG CANDIDATE #3: Savepoint names containing special characters (like
hyphens, dots, or spaces) cause silent failures because they are not
properly escaped when forming SQL identifiers.
"""

from __future__ import annotations

import re
import time
import uuid
from contextlib import contextmanager
from enum import Enum
from typing import Any, Callable, Dict, Generator, List, Optional, Set


class TransactionState(Enum):
    """Possible states of a transaction."""
    INACTIVE = "inactive"
    ACTIVE = "active"
    COMMITTED = "committed"
    ROLLED_BACK = "rolled_back"
    FAILED = "failed"


class Savepoint:
    """Represents a savepoint within a transaction."""

    def __init__(self, name: str, transaction_id: str) -> None:
        # BUG CANDIDATE #3: name is used directly without sanitization
        # If name contains special characters like hyphens or dots,
        # the generated SQL will be invalid but no error is raised
        self.name = name
        self.transaction_id = transaction_id
        self.created_at = time.time()
        self.released = False
        self.rolled_back = False
        self._operations: List[Dict[str, Any]] = []

    def add_operation(self, operation: Dict[str, Any]) -> None:
        """Record an operation after this savepoint."""
        self._operations.append(operation)

    def get_operations(self) -> List[Dict[str, Any]]:
        """Return all operations recorded after this savepoint."""
        return list(self._operations)

    def to_sql_create(self) -> str:
        """Generate SQL to create this savepoint."""
        # BUG: name is not quoted or sanitized — special chars cause
        # silent SQL failures. e.g., 'my-savepoint' becomes
        # SAVEPOINT my-savepoint which is invalid SQL
        return f"SAVEPOINT {self.name}"

    def to_sql_release(self) -> str:
        """Generate SQL to release this savepoint."""
        return f"RELEASE SAVEPOINT {self.name}"

    def to_sql_rollback(self) -> str:
        """Generate SQL to rollback to this savepoint."""
        return f"ROLLBACK TO SAVEPOINT {self.name}"


class Transaction:
    """Manages a database transaction with savepoint support."""

    def __init__(self, connection_id: str = "") -> None:
        self.id = str(uuid.uuid4())
        self.connection_id = connection_id
        self.state = TransactionState.INACTIVE
        self._savepoints: List[Savepoint] = []
        self._operations: List[Dict[str, Any]] = []
        self._sql_log: List[str] = []
        self._on_commit_hooks: List[Callable] = []
        self._on_rollback_hooks: List[Callable] = []
        self._nested_depth: int = 0
        self._start_time: Optional[float] = None

    def begin(self) -> None:
        """Begin the transaction."""
        if self.state == TransactionState.ACTIVE:
            # Nested transaction — create implicit savepoint
            self._nested_depth += 1
            sp_name = f"nested_{self._nested_depth}"
            self.create_savepoint(sp_name)
            return
        self.state = TransactionState.ACTIVE
        self._start_time = time.time()
        self._sql_log.append("BEGIN")

    def commit(self) -> None:
        """Commit the transaction."""
        if self.state != TransactionState.ACTIVE:
            raise RuntimeError(
                f"Cannot commit transaction in state {self.state.value}"
            )
        if self._nested_depth > 0:
            # Release nested savepoint instead of committing
            self._nested_depth -= 1
            if self._savepoints:
                sp = self._savepoints.pop()
                sp.released = True
                self._sql_log.append(sp.to_sql_release())
            return

        self._sql_log.append("COMMIT")
        self.state = TransactionState.COMMITTED

        # Fire commit hooks
        for hook in self._on_commit_hooks:
            try:
                hook(self)
            except Exception:
                pass  # Hooks shouldn't break commits

    def rollback(self) -> None:
        """Rollback the entire transaction."""
        if self.state != TransactionState.ACTIVE:
            raise RuntimeError(
                f"Cannot rollback transaction in state {self.state.value}"
            )
        if self._nested_depth > 0:
            # Rollback to nested savepoint
            self._nested_depth -= 1
            if self._savepoints:
                sp = self._savepoints.pop()
                sp.rolled_back = True
                self._sql_log.append(sp.to_sql_rollback())
            return

        self._sql_log.append("ROLLBACK")
        self.state = TransactionState.ROLLED_BACK
        self._operations.clear()

        # Release all savepoints
        for sp in self._savepoints:
            sp.rolled_back = True
        self._savepoints.clear()

        # Fire rollback hooks
        for hook in self._on_rollback_hooks:
            try:
                hook(self)
            except Exception:
                pass

    def create_savepoint(self, name: str) -> Savepoint:
        """
        Create a named savepoint.

        BUG CANDIDATE #3: The name parameter is not validated or
        sanitized. Special characters in the name produce invalid
        SQL that silently fails.
        """
        if self.state != TransactionState.ACTIVE:
            raise RuntimeError("Cannot create savepoint outside active transaction")

        # BUG: No validation of the name — allows special characters
        # that will produce invalid SQL identifiers
        sp = Savepoint(name, self.id)
        self._savepoints.append(sp)
        self._sql_log.append(sp.to_sql_create())
        return sp

    def rollback_to_savepoint(self, name: str) -> None:
        """Rollback to a specific named savepoint."""
        if self.state != TransactionState.ACTIVE:
            raise RuntimeError("Cannot rollback outside active transaction")

        target_idx = None
        for i, sp in enumerate(self._savepoints):
            if sp.name == name and not sp.released and not sp.rolled_back:
                target_idx = i
                break

        if target_idx is None:
            raise ValueError(f"Savepoint '{name}' not found or already released")

        # Pop savepoints after the target
        while len(self._savepoints) > target_idx + 1:
            removed = self._savepoints.pop()
            removed.rolled_back = True

        sp = self._savepoints[target_idx]
        self._sql_log.append(sp.to_sql_rollback())

        # Remove operations recorded after savepoint
        sp_ops = sp.get_operations()
        for op in sp_ops:
            if op in self._operations:
                self._operations.remove(op)

    def release_savepoint(self, name: str) -> None:
        """Release a named savepoint."""
        for sp in self._savepoints:
            if sp.name == name and not sp.released:
                sp.released = True
                self._sql_log.append(sp.to_sql_release())
                return
        raise ValueError(f"Savepoint '{name}' not found or already released")

    def add_operation(self, operation: Dict[str, Any]) -> None:
        """Record an operation within this transaction."""
        self._operations.append(operation)
        if self._savepoints:
            self._savepoints[-1].add_operation(operation)

    def on_commit(self, callback: Callable) -> None:
        """Register a callback to run on commit."""
        self._on_commit_hooks.append(callback)

    def on_rollback(self, callback: Callable) -> None:
        """Register a callback to run on rollback."""
        self._on_rollback_hooks.append(callback)

    def get_sql_log(self) -> List[str]:
        """Return the SQL log for this transaction."""
        return list(self._sql_log)

    def get_duration(self) -> Optional[float]:
        """Return transaction duration in seconds."""
        if self._start_time is None:
            return None
        return time.time() - self._start_time

    @property
    def is_active(self) -> bool:
        return self.state == TransactionState.ACTIVE

    def __repr__(self) -> str:
        return (
            f"Transaction(id={self.id[:8]}..., state={self.state.value}, "
            f"savepoints={len(self._savepoints)})"
        )


class TransactionManager:
    """Manages multiple transactions and provides context manager support."""

    def __init__(self) -> None:
        self._active_transactions: Dict[str, Transaction] = {}
        self._completed: List[Transaction] = []
        self._global_hooks: Dict[str, List[Callable]] = {
            "pre_begin": [],
            "post_commit": [],
            "post_rollback": [],
        }

    def begin(self, connection_id: str = "default") -> Transaction:
        """Begin a new transaction."""
        if connection_id in self._active_transactions:
            # Nested — reuse existing
            txn = self._active_transactions[connection_id]
            txn.begin()
            return txn

        for hook in self._global_hooks["pre_begin"]:
            hook(connection_id)

        txn = Transaction(connection_id)
        txn.begin()
        self._active_transactions[connection_id] = txn
        return txn

    def commit(self, connection_id: str = "default") -> None:
        """Commit the active transaction for a connection."""
        txn = self._active_transactions.get(connection_id)
        if txn is None:
            raise RuntimeError(f"No active transaction for {connection_id}")
        txn.commit()
        if txn.state == TransactionState.COMMITTED:
            del self._active_transactions[connection_id]
            self._completed.append(txn)
            for hook in self._global_hooks["post_commit"]:
                hook(txn)

    def rollback(self, connection_id: str = "default") -> None:
        """Rollback the active transaction for a connection."""
        txn = self._active_transactions.get(connection_id)
        if txn is None:
            raise RuntimeError(f"No active transaction for {connection_id}")
        txn.rollback()
        if txn.state == TransactionState.ROLLED_BACK:
            del self._active_transactions[connection_id]
            self._completed.append(txn)
            for hook in self._global_hooks["post_rollback"]:
                hook(txn)

    def get_active(self, connection_id: str = "default") -> Optional[Transaction]:
        """Get the active transaction for a connection."""
        return self._active_transactions.get(connection_id)

    @contextmanager
    def transaction(
        self, connection_id: str = "default"
    ) -> Generator[Transaction, None, None]:
        """Context manager for transactions."""
        txn = self.begin(connection_id)
        try:
            yield txn
            if txn.is_active:
                self.commit(connection_id)
        except Exception:
            if txn.is_active:
                self.rollback(connection_id)
            raise

    def add_hook(self, event: str, callback: Callable) -> None:
        """Register a global transaction hook."""
        if event in self._global_hooks:
            self._global_hooks[event].append(callback)

    def get_stats(self) -> Dict[str, Any]:
        """Return transaction statistics."""
        committed = sum(
            1 for t in self._completed
            if t.state == TransactionState.COMMITTED
        )
        rolled_back = sum(
            1 for t in self._completed
            if t.state == TransactionState.ROLLED_BACK
        )
        return {
            "active": len(self._active_transactions),
            "committed": committed,
            "rolled_back": rolled_back,
            "total": len(self._completed),
        }
