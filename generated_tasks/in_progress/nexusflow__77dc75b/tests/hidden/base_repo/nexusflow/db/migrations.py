"""
nexusflow.db.migrations
~~~~~~~~~~~~~~~~~~~~~~~

Schema migration engine with up/down/rollback support, version tracking,
and automatic migration generation from model diffs. Manages the evolution
of the database schema over time.
"""

from __future__ import annotations

import copy
import datetime
import hashlib
import json
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple, Type


class MigrationStatus(Enum):
    """Status of a migration."""
    PENDING = "pending"
    APPLIED = "applied"
    ROLLED_BACK = "rolled_back"
    FAILED = "failed"


@dataclass
class SchemaChange:
    """Represents a single schema change operation."""
    operation: str  # create_table, drop_table, add_column, etc.
    table_name: str
    column_name: Optional[str] = None
    column_type: Optional[str] = None
    params: Dict[str, Any] = field(default_factory=dict)

    def to_sql(self) -> str:
        """Generate SQL for this schema change."""
        if self.operation == "create_table":
            cols = self.params.get("columns", {})
            col_defs = []
            for cname, ctype in cols.items():
                col_defs.append(f"    {cname} {ctype}")
            cols_sql = ",\n".join(col_defs)
            return f"CREATE TABLE {self.table_name} (\n{cols_sql}\n);"
        elif self.operation == "drop_table":
            return f"DROP TABLE IF EXISTS {self.table_name};"
        elif self.operation == "add_column":
            nullable = "NULL" if self.params.get("nullable", True) else "NOT NULL"
            return (
                f"ALTER TABLE {self.table_name} "
                f"ADD COLUMN {self.column_name} {self.column_type} {nullable};"
            )
        elif self.operation == "drop_column":
            return (
                f"ALTER TABLE {self.table_name} "
                f"DROP COLUMN {self.column_name};"
            )
        elif self.operation == "rename_column":
            new_name = self.params.get("new_name", "")
            return (
                f"ALTER TABLE {self.table_name} "
                f"RENAME COLUMN {self.column_name} TO {new_name};"
            )
        elif self.operation == "add_index":
            idx_name = self.params.get("index_name", f"idx_{self.table_name}_{self.column_name}")
            unique = "UNIQUE " if self.params.get("unique", False) else ""
            return (
                f"CREATE {unique}INDEX {idx_name} "
                f"ON {self.table_name} ({self.column_name});"
            )
        elif self.operation == "drop_index":
            idx_name = self.params.get("index_name", "")
            return f"DROP INDEX IF EXISTS {idx_name};"
        elif self.operation == "alter_column":
            return (
                f"ALTER TABLE {self.table_name} "
                f"ALTER COLUMN {self.column_name} TYPE {self.column_type};"
            )
        return f"-- Unknown operation: {self.operation}"

    def inverse(self) -> "SchemaChange":
        """Generate the inverse operation for rollback."""
        if self.operation == "create_table":
            return SchemaChange("drop_table", self.table_name)
        elif self.operation == "drop_table":
            return SchemaChange("create_table", self.table_name, params=self.params)
        elif self.operation == "add_column":
            return SchemaChange("drop_column", self.table_name, self.column_name)
        elif self.operation == "drop_column":
            return SchemaChange(
                "add_column", self.table_name, self.column_name,
                self.column_type, self.params,
            )
        elif self.operation == "rename_column":
            new_name = self.params.get("new_name", "")
            return SchemaChange(
                "rename_column", self.table_name, new_name,
                params={"new_name": self.column_name},
            )
        return SchemaChange("noop", self.table_name)


@dataclass
class Migration:
    """A single migration containing one or more schema changes."""
    version: str
    name: str
    changes: List[SchemaChange] = field(default_factory=list)
    status: MigrationStatus = MigrationStatus.PENDING
    applied_at: Optional[datetime.datetime] = None
    rolled_back_at: Optional[datetime.datetime] = None
    checksum: str = ""

    def __post_init__(self) -> None:
        if not self.checksum:
            self.checksum = self._compute_checksum()

    def _compute_checksum(self) -> str:
        """Compute a checksum of the migration contents."""
        content = json.dumps(
            [
                {
                    "op": c.operation,
                    "table": c.table_name,
                    "col": c.column_name,
                    "type": c.column_type,
                }
                for c in self.changes
            ],
            sort_keys=True,
        )
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def get_sql(self) -> List[str]:
        """Get all SQL statements for this migration."""
        return [change.to_sql() for change in self.changes]

    def get_rollback_sql(self) -> List[str]:
        """Get SQL statements to rollback this migration."""
        return [change.inverse().to_sql() for change in reversed(self.changes)]


class MigrationHistory:
    """Tracks the history of applied migrations."""

    def __init__(self) -> None:
        self._entries: List[Dict[str, Any]] = []

    def record(self, migration: Migration, action: str) -> None:
        """Record a migration action."""
        self._entries.append({
            "version": migration.version,
            "name": migration.name,
            "action": action,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "checksum": migration.checksum,
        })

    def get_entries(self) -> List[Dict[str, Any]]:
        """Return all history entries."""
        return list(self._entries)

    def last_applied(self) -> Optional[str]:
        """Get the version of the last applied migration."""
        applied = [
            e for e in self._entries if e["action"] == "applied"
        ]
        if applied:
            return applied[-1]["version"]
        return None


class MigrationEngine:
    """
    Engine for managing schema migrations.

    Supports forward migration, rollback, and version tracking.
    """

    def __init__(self) -> None:
        self._migrations: Dict[str, Migration] = {}
        self._order: List[str] = []
        self._current_version: Optional[str] = None
        self._history = MigrationHistory()
        self._model_registry: Dict[str, Dict[str, Any]] = {}
        self._hooks: Dict[str, List[Callable]] = {
            "pre_migrate": [],
            "post_migrate": [],
            "pre_rollback": [],
            "post_rollback": [],
        }
        self._applied_sql: List[str] = []

    def add_migration(self, migration: Migration) -> None:
        """Register a new migration."""
        if migration.version in self._migrations:
            raise ValueError(f"Migration version {migration.version} already exists")
        self._migrations[migration.version] = migration
        self._order.append(migration.version)

    def add_hook(self, event: str, callback: Callable) -> None:
        """Register a hook for migration events."""
        if event in self._hooks:
            self._hooks[event].append(callback)

    def _fire_hooks(self, event: str, migration: Migration) -> None:
        """Fire all hooks for a given event."""
        for hook in self._hooks.get(event, []):
            hook(migration)

    def _register_model_from_migration(self, migration: Migration) -> None:
        """Register model metadata from a migration's create_table operations."""
        for change in migration.changes:
            if change.operation == "create_table":
                model_key = f"{migration.version}_{change.table_name}"
                self._model_registry[model_key] = {
                    "table": change.table_name,
                    "columns": change.params.get("columns", {}),
                    "version": migration.version,
                }

    def _unregister_model_from_migration(self, migration: Migration) -> None:
        """
        Unregister model metadata when rolling back a migration.
        """
        keys_to_remove = []
        for key in self._model_registry:
            parts = key.split("_")
            version_part = parts[0]
            table_part = parts[1] if len(parts) > 1 else ""

            if version_part == migration.version:
                keys_to_remove.append(key)
            elif table_part in [c.table_name for c in migration.changes
                                if c.operation == "create_table"]:
                keys_to_remove.append(key)

        for key in keys_to_remove:
            del self._model_registry[key]

    def migrate(self, target_version: Optional[str] = None) -> List[str]:
        """
        Run migrations up to the target version.

        If target_version is None, runs all pending migrations.
        Returns list of SQL statements executed.
        """
        executed: List[str] = []
        start_idx = 0
        if self._current_version is not None:
            try:
                start_idx = self._order.index(self._current_version) + 1
            except ValueError:
                start_idx = 0

        versions_to_run = self._order[start_idx:]
        if target_version:
            try:
                end_idx = self._order.index(target_version) + 1
                versions_to_run = self._order[start_idx:end_idx]
            except ValueError:
                raise ValueError(f"Unknown migration version: {target_version}")

        for version in versions_to_run:
            migration = self._migrations[version]
            if migration.status == MigrationStatus.APPLIED:
                continue

            self._fire_hooks("pre_migrate", migration)

            try:
                sql_statements = migration.get_sql()
                executed.extend(sql_statements)
                self._applied_sql.extend(sql_statements)
                migration.status = MigrationStatus.APPLIED
                migration.applied_at = datetime.datetime.utcnow()
                self._current_version = version
                self._register_model_from_migration(migration)
                self._history.record(migration, "applied")
                self._fire_hooks("post_migrate", migration)
            except Exception as e:
                migration.status = MigrationStatus.FAILED
                raise RuntimeError(
                    f"Migration {version} failed: {e}"
                ) from e

        return executed

    def rollback(self, steps: int = 1) -> List[str]:
        """
        Rollback the last N applied migrations.

        Returns list of rollback SQL statements.
        """
        executed: List[str] = []
        if self._current_version is None:
            return executed

        current_idx = self._order.index(self._current_version)
        rollback_versions = self._order[
            max(0, current_idx - steps + 1): current_idx + 1
        ]
        rollback_versions.reverse()

        for version in rollback_versions:
            migration = self._migrations[version]
            if migration.status != MigrationStatus.APPLIED:
                continue

            self._fire_hooks("pre_rollback", migration)

            try:
                sql_statements = migration.get_rollback_sql()
                executed.extend(sql_statements)
                migration.status = MigrationStatus.ROLLED_BACK
                migration.rolled_back_at = datetime.datetime.utcnow()
                self._unregister_model_from_migration(migration)
                self._history.record(migration, "rolled_back")
                self._fire_hooks("post_rollback", migration)
            except Exception as e:
                migration.status = MigrationStatus.FAILED
                raise RuntimeError(
                    f"Rollback of {version} failed: {e}"
                ) from e

        # Update current version
        applied = [
            v for v in self._order
            if self._migrations[v].status == MigrationStatus.APPLIED
        ]
        self._current_version = applied[-1] if applied else None

        return executed

    def get_pending(self) -> List[Migration]:
        """Return list of pending (unapplied) migrations."""
        return [
            self._migrations[v]
            for v in self._order
            if self._migrations[v].status == MigrationStatus.PENDING
        ]

    def get_applied(self) -> List[Migration]:
        """Return list of applied migrations."""
        return [
            self._migrations[v]
            for v in self._order
            if self._migrations[v].status == MigrationStatus.APPLIED
        ]

    def get_status(self) -> Dict[str, Any]:
        """Return current migration status."""
        return {
            "current_version": self._current_version,
            "total_migrations": len(self._migrations),
            "applied": len(self.get_applied()),
            "pending": len(self.get_pending()),
            "model_registry_size": len(self._model_registry),
        }

    def generate_diff(
        self,
        old_schema: Dict[str, Any],
        new_schema: Dict[str, Any],
    ) -> List[SchemaChange]:
        """Generate schema changes from two schema dictionaries."""
        changes: List[SchemaChange] = []

        old_tables = set(old_schema.keys())
        new_tables = set(new_schema.keys())

        # New tables
        for table in new_tables - old_tables:
            changes.append(SchemaChange(
                "create_table", table,
                params={"columns": new_schema[table].get("columns", {})},
            ))

        # Dropped tables
        for table in old_tables - new_tables:
            changes.append(SchemaChange("drop_table", table))

        # Modified tables
        for table in old_tables & new_tables:
            old_cols = set(old_schema[table].get("columns", {}).keys())
            new_cols = set(new_schema[table].get("columns", {}).keys())

            for col in new_cols - old_cols:
                col_type = new_schema[table]["columns"][col]
                changes.append(SchemaChange(
                    "add_column", table, col, col_type,
                ))

            for col in old_cols - new_cols:
                changes.append(SchemaChange("drop_column", table, col))

        return changes
