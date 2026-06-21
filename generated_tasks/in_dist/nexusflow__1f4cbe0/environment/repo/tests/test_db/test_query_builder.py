"""Tests for nexusflow.db.query_builder.QueryBuilder."""

import pytest

from nexusflow.db.query_builder import (
    Condition,
    JoinType,
    OrderDirection,
    QueryBuilder,
    QueryError,
    col_between,
    col_eq,
    col_gt,
    col_in,
    col_is_not_null,
    col_is_null,
    col_like,
    col_lt,
    col_lte,
    col_ne,
)


class TestSelectQueries:
    """Tests for SELECT query building."""

    def test_simple_select_all(self):
        sql, params = QueryBuilder().from_table("users").build()
        assert "SELECT *" in sql
        assert "FROM users" in sql
        assert params == []

    def test_select_specific_columns(self):
        sql, params = (
            QueryBuilder()
            .select("id", "name", "email")
            .from_table("users")
            .build()
        )
        assert "SELECT id, name, email" in sql

    def test_select_distinct(self):
        sql, params = (
            QueryBuilder()
            .select("city")
            .distinct()
            .from_table("addresses")
            .build()
        )
        assert "SELECT DISTINCT city" in sql

    def test_select_with_alias(self):
        sql, params = (
            QueryBuilder()
            .select("*")
            .from_table("users", alias="u")
            .build()
        )
        assert "FROM users AS u" in sql

    def test_where_single_condition(self):
        sql, params = (
            QueryBuilder()
            .select("*")
            .from_table("users")
            .where(col_eq("active", True))
            .build()
        )
        assert "WHERE" in sql
        assert "active = $1" in sql
        assert params == [True]

    def test_where_multiple_conditions(self):
        sql, params = (
            QueryBuilder()
            .select("*")
            .from_table("users")
            .where(col_eq("active", True))
            .where(col_gt("age", 18))
            .build()
        )
        assert "$1" in sql
        assert "$2" in sql
        assert params == [True, 18]

    def test_order_by_asc(self):
        sql, params = (
            QueryBuilder()
            .select("*")
            .from_table("users")
            .order_by("name")
            .build()
        )
        assert "ORDER BY name ASC" in sql

    def test_order_by_desc(self):
        sql, params = (
            QueryBuilder()
            .select("*")
            .from_table("users")
            .order_by("created_at", OrderDirection.DESC)
            .build()
        )
        assert "ORDER BY created_at DESC" in sql

    def test_limit(self):
        sql, params = (
            QueryBuilder()
            .select("*")
            .from_table("users")
            .limit(10)
            .build()
        )
        assert "LIMIT $1" in sql
        assert 10 in params

    def test_offset(self):
        sql, params = (
            QueryBuilder()
            .select("*")
            .from_table("users")
            .limit(10)
            .offset(20)
            .build()
        )
        assert "OFFSET" in sql
        assert 20 in params

    def test_negative_limit_raises(self):
        with pytest.raises(QueryError, match="non-negative"):
            QueryBuilder().limit(-1)

    def test_negative_offset_raises(self):
        with pytest.raises(QueryError, match="non-negative"):
            QueryBuilder().offset(-5)

    def test_for_update(self):
        sql, params = (
            QueryBuilder()
            .select("*")
            .from_table("accounts")
            .where(col_eq("id", 1))
            .for_update()
            .build()
        )
        assert "FOR UPDATE" in sql

    def test_group_by_and_having(self):
        sql, params = (
            QueryBuilder()
            .select("city", "COUNT(*)")
            .from_table("users")
            .group_by("city")
            .having(col_gt("COUNT(*)", 5))
            .build()
        )
        assert "GROUP BY city" in sql
        assert "HAVING" in sql


class TestInsertQueries:
    """Tests for INSERT query building."""

    def test_simple_insert(self):
        sql, params = (
            QueryBuilder()
            .insert_into("users", "name", "email")
            .values("Alice", "alice@example.com")
            .build()
        )
        assert "INSERT INTO users" in sql
        assert "(name, email)" in sql
        assert "VALUES ($1, $2)" in sql
        assert params == ["Alice", "alice@example.com"]

    def test_multi_row_insert(self):
        sql, params = (
            QueryBuilder()
            .insert_into("users", "name", "email")
            .values("Alice", "a@a.com")
            .values("Bob", "b@b.com")
            .build()
        )
        assert "$1" in sql
        assert "$4" in sql
        assert len(params) == 4

    def test_insert_returning(self):
        sql, params = (
            QueryBuilder()
            .insert_into("users", "name")
            .values("Alice")
            .returning("id")
            .build()
        )
        assert "RETURNING id" in sql

    def test_insert_wrong_value_count_raises(self):
        with pytest.raises(QueryError, match="Expected 2 values"):
            (
                QueryBuilder()
                .insert_into("users", "name", "email")
                .values("only_one")
            )


class TestUpdateQueries:
    """Tests for UPDATE query building."""

    def test_simple_update(self):
        sql, params = (
            QueryBuilder()
            .update("users")
            .set("name", "Bob")
            .where(col_eq("id", 1))
            .build()
        )
        assert "UPDATE users" in sql
        assert "SET name = $1" in sql
        assert "WHERE" in sql
        assert params[0] == "Bob"

    def test_update_multiple_sets(self):
        sql, params = (
            QueryBuilder()
            .update("users")
            .set("name", "Bob")
            .set("email", "bob@b.com")
            .where(col_eq("id", 1))
            .build()
        )
        assert "name = $1" in sql
        assert "email = $2" in sql

    def test_update_returning(self):
        sql, params = (
            QueryBuilder()
            .update("users")
            .set("name", "Bob")
            .returning("id", "name")
            .build()
        )
        assert "RETURNING id, name" in sql


class TestDeleteQueries:
    """Tests for DELETE query building."""

    def test_simple_delete(self):
        sql, params = (
            QueryBuilder()
            .delete_from("users")
            .where(col_eq("id", 1))
            .build()
        )
        assert "DELETE FROM users" in sql
        assert "WHERE" in sql
        assert params == [1]

    def test_delete_returning(self):
        sql, params = (
            QueryBuilder()
            .delete_from("users")
            .where(col_eq("active", False))
            .returning("id")
            .build()
        )
        assert "RETURNING id" in sql


class TestJoinQueries:
    """Tests for JOIN clauses."""

    def test_inner_join(self):
        sql, params = (
            QueryBuilder()
            .select("u.name", "p.title")
            .from_table("users", alias="u")
            .join("posts", on="u.id = p.user_id", alias="p")
            .build()
        )
        assert "INNER JOIN posts AS p ON u.id = p.user_id" in sql

    def test_left_join(self):
        sql, params = (
            QueryBuilder()
            .select("*")
            .from_table("users")
            .join("orders", on="users.id = orders.user_id", join_type=JoinType.LEFT)
            .build()
        )
        assert "LEFT JOIN orders" in sql


class TestConditions:
    """Tests for condition helpers and combinators."""

    def test_col_ne(self):
        cond = col_ne("status", "deleted")
        assert "!=" in cond.clause
        assert cond.params == ["deleted"]

    def test_col_in(self):
        cond = col_in("id", [1, 2, 3])
        assert "IN" in cond.clause
        assert cond.params == [1, 2, 3]

    def test_col_like(self):
        cond = col_like("name", "%alice%")
        assert "LIKE" in cond.clause

    def test_col_is_null(self):
        cond = col_is_null("deleted_at")
        assert "IS NULL" in cond.clause

    def test_col_is_not_null(self):
        cond = col_is_not_null("email")
        assert "IS NOT NULL" in cond.clause

    def test_col_between(self):
        cond = col_between("age", 18, 65)
        assert "BETWEEN" in cond.clause
        assert cond.params == [18, 65]

    def test_condition_and(self):
        c1 = col_eq("a", 1)
        c2 = col_eq("b", 2)
        combined = c1 & c2
        assert "AND" in combined.clause
        assert combined.params == [1, 2]

    def test_condition_or(self):
        c1 = col_eq("a", 1)
        c2 = col_eq("b", 2)
        combined = c1 | c2
        assert "OR" in combined.clause

    def test_condition_not(self):
        c1 = col_eq("active", True)
        inverted = ~c1
        assert "NOT" in inverted.clause

    def test_invalid_identifier_raises(self):
        with pytest.raises(QueryError, match="Invalid SQL identifier"):
            col_eq("'; DROP TABLE users --", 1)
