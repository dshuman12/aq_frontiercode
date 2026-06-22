from __future__ import annotations

import sys
import types
from pathlib import Path

import pytest


def _load_parser_modules():
    repo_root = Path(__file__).resolve().parents[1]
    src_root = repo_root / "src"

    queryweave_pkg = types.ModuleType("queryweave")
    queryweave_pkg.__path__ = [str(src_root / "queryweave")]
    sys.modules["queryweave"] = queryweave_pkg

    parser_pkg = types.ModuleType("queryweave.parser")
    parser_pkg.__path__ = [str(src_root / "queryweave" / "parser")]
    sys.modules["queryweave.parser"] = parser_pkg

    from queryweave.parser.parser import ParseError, parse
    from queryweave.parser.ast_nodes import (
        AggregateExpr,
        AliasExpr,
        BetweenExpr,
        BinaryExpr,
        ColumnRef,
        InExpr,
        IsNullExpr,
        JoinClause,
        LimitClause,
        OrderByClause,
        SelectStmt,
        StarExpr,
        TableRef,
        UnaryExpr,
    )

    return {
        "parse": parse,
        "ParseError": ParseError,
        "AggregateExpr": AggregateExpr,
        "AliasExpr": AliasExpr,
        "BetweenExpr": BetweenExpr,
        "BinaryExpr": BinaryExpr,
        "ColumnRef": ColumnRef,
        "InExpr": InExpr,
        "IsNullExpr": IsNullExpr,
        "JoinClause": JoinClause,
        "LimitClause": LimitClause,
        "OrderByClause": OrderByClause,
        "SelectStmt": SelectStmt,
        "StarExpr": StarExpr,
        "TableRef": TableRef,
        "UnaryExpr": UnaryExpr,
    }


M = _load_parser_modules()
parse = M["parse"]


def test_select_with_aliases_join_filter_order_and_limit():
    stmt = parse(
        "SELECT u.name, age + 1 AS next_age FROM app.users AS u "
        "LEFT JOIN scores s ON u.id = s.user_id "
        "WHERE age >= 18 AND active = TRUE ORDER BY u.name DESC LIMIT 10 OFFSET 5;"
    )

    assert isinstance(stmt, M["SelectStmt"])
    assert isinstance(stmt.from_table, M["TableRef"])
    assert stmt.from_table.schema == "app"
    assert stmt.from_table.name == "users"
    assert stmt.from_table.alias == "u"
    assert len(stmt.columns) == 2
    assert isinstance(stmt.columns[0], M["ColumnRef"])
    assert stmt.columns[0].table == "u"
    assert isinstance(stmt.columns[1], M["AliasExpr"])
    assert stmt.columns[1].alias == "next_age"
    assert isinstance(stmt.columns[1].expr, M["BinaryExpr"])
    assert stmt.columns[1].expr.operator == "+"
    assert len(stmt.joins) == 1
    assert isinstance(stmt.joins[0], M["JoinClause"])
    assert stmt.joins[0].join_type == "LEFT"
    assert isinstance(stmt.where.condition, M["BinaryExpr"])
    assert stmt.where.condition.operator == "AND"
    assert isinstance(stmt.order_by, M["OrderByClause"])
    assert stmt.order_by.items[0].ascending is False
    assert isinstance(stmt.limit, M["LimitClause"])
    assert (stmt.limit.limit, stmt.limit.offset) == (10, 5)


def test_group_having_aggregate_and_predicates():
    stmt = parse(
        "SELECT dept, SUM(amount) AS total FROM sales "
        "WHERE region IN ('west', 'east') OR amount BETWEEN 10 AND 20 "
        "GROUP BY dept HAVING SUM(amount) > 0;"
    )

    assert isinstance(stmt.columns[1], M["AliasExpr"])
    assert isinstance(stmt.columns[1].expr, M["AggregateExpr"])
    assert stmt.columns[1].expr.function == "SUM"
    assert stmt.group_by is not None
    assert stmt.having is not None
    assert isinstance(stmt.where.condition, M["BinaryExpr"])
    assert stmt.where.condition.operator == "OR"
    assert isinstance(stmt.where.condition.left, M["InExpr"])
    assert isinstance(stmt.where.condition.right, M["BetweenExpr"])


def test_star_count_null_and_not_precedence():
    stmt = parse(
        "SELECT *, COUNT(*) AS total FROM events "
        "WHERE NOT archived AND deleted_at IS NULL;"
    )

    assert isinstance(stmt.columns[0], M["StarExpr"])
    assert isinstance(stmt.columns[1], M["AliasExpr"])
    assert isinstance(stmt.columns[1].expr, M["AggregateExpr"])
    where = stmt.where.condition
    assert isinstance(where, M["BinaryExpr"])
    assert where.operator == "AND"
    assert isinstance(where.left, M["UnaryExpr"])
    assert where.left.operator == "NOT"
    assert isinstance(where.right, M["IsNullExpr"])


@pytest.mark.parametrize(
    "query",
    [
        "SELECT FROM users;",
        "SELECT name FROM users WHERE",
        "SELECT name FROM users ORDER BY;",
        "UPDATE users SET name = 'Ada';",
    ],
)
def test_malformed_or_out_of_scope_queries_raise_parse_error(query):
    with pytest.raises(M["ParseError"]):
        parse(query)
