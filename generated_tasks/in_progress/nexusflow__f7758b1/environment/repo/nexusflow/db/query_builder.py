"""SQL query builder with support for SELECT, INSERT, UPDATE, DELETE, joins, and subqueries."""

from __future__ import annotations

import re
import logging
from enum import Enum
from typing import Any, Optional, Union

logger = logging.getLogger(__name__)


class QueryError(Exception):
    """Raised when a query cannot be built."""
    pass


class JoinType(Enum):
    INNER = "INNER JOIN"
    LEFT = "LEFT JOIN"
    RIGHT = "RIGHT JOIN"
    FULL = "FULL OUTER JOIN"
    CROSS = "CROSS JOIN"


class OrderDirection(Enum):
    ASC = "ASC"
    DESC = "DESC"


class Condition:
    """Represents a WHERE condition with parameterized values."""

    def __init__(self, clause: str, params: Optional[list[Any]] = None) -> None:
        self.clause = clause
        self.params = params or []

    def __and__(self, other: "Condition") -> "Condition":
        return Condition(
            f"({self.clause} AND {other.clause})",
            self.params + other.params,
        )

    def __or__(self, other: "Condition") -> "Condition":
        return Condition(
            f"({self.clause} OR {other.clause})",
            self.params + other.params,
        )

    def __invert__(self) -> "Condition":
        return Condition(f"NOT ({self.clause})", self.params)


def col_eq(column: str, value: Any) -> Condition:
    """column = $X"""
    return Condition(f"{_safe_identifier(column)} = ${{}}", [value])


def col_ne(column: str, value: Any) -> Condition:
    """column != $X"""
    return Condition(f"{_safe_identifier(column)} != ${{}}", [value])


def col_gt(column: str, value: Any) -> Condition:
    return Condition(f"{_safe_identifier(column)} > ${{}}", [value])


def col_lt(column: str, value: Any) -> Condition:
    return Condition(f"{_safe_identifier(column)} < ${{}}", [value])


def col_gte(column: str, value: Any) -> Condition:
    return Condition(f"{_safe_identifier(column)} >= ${{}}", [value])


def col_lte(column: str, value: Any) -> Condition:
    return Condition(f"{_safe_identifier(column)} <= ${{}}", [value])


def col_in(column: str, values: list[Any]) -> Condition:
    placeholders = ", ".join(["${}"] * len(values))
    return Condition(f"{_safe_identifier(column)} IN ({placeholders})", values)


def col_like(column: str, pattern: str) -> Condition:
    return Condition(f"{_safe_identifier(column)} LIKE ${{}}", [pattern])


def col_is_null(column: str) -> Condition:
    return Condition(f"{_safe_identifier(column)} IS NULL")


def col_is_not_null(column: str) -> Condition:
    return Condition(f"{_safe_identifier(column)} IS NOT NULL")


def col_between(column: str, low: Any, high: Any) -> Condition:
    return Condition(f"{_safe_identifier(column)} BETWEEN ${{}}", [low, high])


def _safe_identifier(name: str) -> str:
    """
    Validate and return a safe SQL identifier.
    """
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_.\-]*$', name):
        raise QueryError(f"Invalid SQL identifier: {name!r}")
    return name


class QueryBuilder:
    """
    Fluent SQL query builder with parameterized queries.

    Usage:
        query, params = (
            QueryBuilder()
            .select("id", "name", "email")
            .from_table("users")
            .where(col_eq("active", True))
            .order_by("name")
            .limit(10)
            .build()
        )
    """

    def __init__(self) -> None:
        self._select_cols: list[str] = []
        self._from_table_name: Optional[str] = None
        self._from_alias: Optional[str] = None
        self._joins: list[tuple[JoinType, str, str, str]] = []  # (type, table, alias, on)
        self._conditions: list[Condition] = []
        self._group_by: list[str] = []
        self._having: list[Condition] = []
        self._order_by: list[tuple[str, OrderDirection]] = []
        self._limit_val: Optional[int] = None
        self._offset_val: Optional[int] = None
        self._distinct = False
        self._for_update = False

        # INSERT
        self._insert_table: Optional[str] = None
        self._insert_columns: list[str] = []
        self._insert_values: list[list[Any]] = []
        self._insert_returning: list[str] = []

        # UPDATE
        self._update_table: Optional[str] = None
        self._update_sets: dict[str, Any] = {}
        self._update_returning: list[str] = []

        # DELETE
        self._delete_table: Optional[str] = None
        self._delete_returning: list[str] = []

    def select(self, *columns: str) -> "QueryBuilder":
        self._select_cols.extend(columns)
        return self

    def distinct(self) -> "QueryBuilder":
        self._distinct = True
        return self

    def from_table(self, table: str, alias: Optional[str] = None) -> "QueryBuilder":
        self._from_table_name = _safe_identifier(table)
        self._from_alias = alias
        return self

    def join(
        self,
        table: str,
        on: str,
        join_type: JoinType = JoinType.INNER,
        alias: Optional[str] = None,
    ) -> "QueryBuilder":
        """
        Add a JOIN clause.
        """
        safe_table = _safe_identifier(table)
        self._joins.append((join_type, safe_table, alias or "", on))
        return self

    def where(self, condition: Condition) -> "QueryBuilder":
        self._conditions.append(condition)
        return self

    def group_by(self, *columns: str) -> "QueryBuilder":
        self._group_by.extend(_safe_identifier(c) for c in columns)
        return self

    def having(self, condition: Condition) -> "QueryBuilder":
        self._having.append(condition)
        return self

    def order_by(
        self, column: str, direction: OrderDirection = OrderDirection.ASC
    ) -> "QueryBuilder":
        self._order_by.append((_safe_identifier(column), direction))
        return self

    def limit(self, n: int) -> "QueryBuilder":
        if n < 0:
            raise QueryError("LIMIT must be non-negative")
        self._limit_val = n
        return self

    def offset(self, n: int) -> "QueryBuilder":
        if n < 0:
            raise QueryError("OFFSET must be non-negative")
        self._offset_val = n
        return self

    def for_update(self) -> "QueryBuilder":
        self._for_update = True
        return self

    # INSERT
    def insert_into(self, table: str, *columns: str) -> "QueryBuilder":
        self._insert_table = _safe_identifier(table)
        self._insert_columns = [_safe_identifier(c) for c in columns]
        return self

    def values(self, *vals: Any) -> "QueryBuilder":
        if self._insert_columns and len(vals) != len(self._insert_columns):
            raise QueryError(
                f"Expected {len(self._insert_columns)} values, got {len(vals)}"
            )
        self._insert_values.append(list(vals))
        return self

    def returning(self, *columns: str) -> "QueryBuilder":
        ret_cols = [_safe_identifier(c) for c in columns]
        if self._insert_table:
            self._insert_returning = ret_cols
        elif self._update_table:
            self._update_returning = ret_cols
        elif self._delete_table:
            self._delete_returning = ret_cols
        return self

    # UPDATE
    def update(self, table: str) -> "QueryBuilder":
        self._update_table = _safe_identifier(table)
        return self

    def set(self, column: str, value: Any) -> "QueryBuilder":
        self._update_sets[_safe_identifier(column)] = value
        return self

    # DELETE
    def delete_from(self, table: str) -> "QueryBuilder":
        self._delete_table = _safe_identifier(table)
        return self

    def build(self) -> tuple[str, list[Any]]:
        """Build the SQL query and parameter list."""
        if self._insert_table:
            return self._build_insert()
        elif self._update_table:
            return self._build_update()
        elif self._delete_table:
            return self._build_delete()
        else:
            return self._build_select()

    def _build_select(self) -> tuple[str, list[Any]]:
        params: list[Any] = []
        param_idx = 1

        # SELECT
        cols = ", ".join(self._select_cols) if self._select_cols else "*"
        distinct = "DISTINCT " if self._distinct else ""
        parts = [f"SELECT {distinct}{cols}"]

        # FROM
        if self._from_table_name:
            from_clause = self._from_table_name
            if self._from_alias:
                from_clause += f" AS {self._from_alias}"
            parts.append(f"FROM {from_clause}")

        # JOINS
        for join_type, table, alias, on_clause in self._joins:
            join_str = f"{join_type.value} {table}"
            if alias:
                join_str += f" AS {alias}"
            join_str += f" ON {on_clause}"
            parts.append(join_str)

        # WHERE
        if self._conditions:
            where_clause, where_params, param_idx = self._build_conditions(
                self._conditions, param_idx
            )
            parts.append(f"WHERE {where_clause}")
            params.extend(where_params)

        # GROUP BY
        if self._group_by:
            parts.append(f"GROUP BY {', '.join(self._group_by)}")

        # HAVING
        if self._having:
            having_clause, having_params, param_idx = self._build_conditions(
                self._having, param_idx
            )
            parts.append(f"HAVING {having_clause}")
            params.extend(having_params)

        # ORDER BY
        if self._order_by:
            order_parts = [f"{col} {dir.value}" for col, dir in self._order_by]
            parts.append(f"ORDER BY {', '.join(order_parts)}")

        # LIMIT / OFFSET
        if self._limit_val is not None:
            parts.append(f"LIMIT ${param_idx}")
            params.append(self._limit_val)
            param_idx += 1

        if self._offset_val is not None:
            parts.append(f"OFFSET ${param_idx}")
            params.append(self._offset_val)
            param_idx += 1

        # FOR UPDATE
        if self._for_update:
            parts.append("FOR UPDATE")

        return " ".join(parts), params

    def _build_insert(self) -> tuple[str, list[Any]]:
        params: list[Any] = []
        param_idx = 1

        cols = ", ".join(self._insert_columns)
        parts = [f"INSERT INTO {self._insert_table} ({cols})"]

        # VALUES
        value_rows = []
        for row in self._insert_values:
            placeholders = []
            for val in row:
                placeholders.append(f"${param_idx}")
                params.append(val)
                param_idx += 1
            value_rows.append(f"({', '.join(placeholders)})")

        parts.append(f"VALUES {', '.join(value_rows)}")

        if self._insert_returning:
            parts.append(f"RETURNING {', '.join(self._insert_returning)}")

        return " ".join(parts), params

    def _build_update(self) -> tuple[str, list[Any]]:
        params: list[Any] = []
        param_idx = 1

        parts = [f"UPDATE {self._update_table}"]

        # SET
        set_parts = []
        for col, val in self._update_sets.items():
            set_parts.append(f"{col} = ${param_idx}")
            params.append(val)
            param_idx += 1
        parts.append(f"SET {', '.join(set_parts)}")

        # WHERE
        if self._conditions:
            where_clause, where_params, param_idx = self._build_conditions(
                self._conditions, param_idx
            )
            parts.append(f"WHERE {where_clause}")
            params.extend(where_params)

        if self._update_returning:
            parts.append(f"RETURNING {', '.join(self._update_returning)}")

        return " ".join(parts), params

    def _build_delete(self) -> tuple[str, list[Any]]:
        params: list[Any] = []
        param_idx = 1

        parts = [f"DELETE FROM {self._delete_table}"]

        if self._conditions:
            where_clause, where_params, param_idx = self._build_conditions(
                self._conditions, param_idx
            )
            parts.append(f"WHERE {where_clause}")
            params.extend(where_params)

        if self._delete_returning:
            parts.append(f"RETURNING {', '.join(self._delete_returning)}")

        return " ".join(parts), params

    def _build_conditions(
        self, conditions: list[Condition], start_idx: int
    ) -> tuple[str, list[Any], int]:
        """Build WHERE/HAVING clause with numbered parameters."""
        clauses = []
        params = []
        idx = start_idx

        for cond in conditions:
            clause = cond.clause
            for param in cond.params:
                clause = clause.replace("${}", f"${idx}", 1)
                params.append(param)
                idx += 1
            clauses.append(clause)

        return " AND ".join(clauses), params, idx
