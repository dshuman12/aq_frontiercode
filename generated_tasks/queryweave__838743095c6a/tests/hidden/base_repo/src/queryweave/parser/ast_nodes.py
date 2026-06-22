"""AST node definitions for the QueryWeave query language."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Node:
    """Base class for all AST nodes."""

    def accept(self, visitor: Any) -> Any:
        method = f"visit_{type(self).__name__}"
        handler = getattr(visitor, method, None)
        if handler:
            return handler(self)
        return None


@dataclass
class Expression(Node):
    """Base for all expression nodes."""


@dataclass
class LiteralExpr(Expression):
    """A literal value (number, string, bool, null)."""

    value: Any
    literal_type: str  # 'integer', 'float', 'string', 'boolean', 'null'


@dataclass
class ColumnRef(Expression):
    """Reference to a column, optionally qualified by table."""

    name: str
    table: str | None = None

    @property
    def qualified_name(self) -> str:
        if self.table:
            return f"{self.table}.{self.name}"
        return self.name


@dataclass
class StarExpr(Expression):
    """Represents * or table.* in SELECT."""

    table: str | None = None


@dataclass
class BinaryExpr(Expression):
    """Binary operation: left op right."""

    left: Expression
    operator: str
    right: Expression


@dataclass
class UnaryExpr(Expression):
    """Unary operation: op operand."""

    operator: str
    operand: Expression


@dataclass
class FunctionCall(Expression):
    """A function invocation."""

    name: str
    args: list[Expression] = field(default_factory=list)
    distinct: bool = False


@dataclass
class AggregateExpr(Expression):
    """Aggregate function: COUNT, SUM, AVG, MIN, MAX."""

    function: str
    arg: Expression | None = None
    distinct: bool = False


@dataclass
class WindowExpr(Expression):
    """Window function expression with OVER clause."""

    function: FunctionCall | AggregateExpr
    partition_by: list[Expression] = field(default_factory=list)
    order_by: list[OrderByItem] | None = None
    frame: WindowFrame | None = None


@dataclass
class WindowFrame:
    """Window frame specification."""

    mode: str  # ROWS or RANGE
    start: FrameBound | None = None
    end: FrameBound | None = None


@dataclass
class FrameBound:
    """A single frame bound."""

    bound_type: str  # UNBOUNDED PRECEDING, CURRENT ROW, N PRECEDING, N FOLLOWING
    offset: int | None = None


@dataclass
class AliasExpr(Expression):
    """An expression with an alias."""

    expr: Expression
    alias: str


@dataclass
class InExpr(Expression):
    """expr IN (values...) or expr IN (subquery)."""

    expr: Expression
    values: list[Expression] | SubqueryExpr
    negated: bool = False


@dataclass
class BetweenExpr(Expression):
    """expr BETWEEN low AND high."""

    expr: Expression
    low: Expression
    high: Expression
    negated: bool = False


@dataclass
class LikeExpr(Expression):
    """expr LIKE pattern."""

    expr: Expression
    pattern: Expression
    negated: bool = False


@dataclass
class IsNullExpr(Expression):
    """expr IS [NOT] NULL."""

    expr: Expression
    negated: bool = False


@dataclass
class ExistsExpr(Expression):
    """EXISTS (subquery)."""

    subquery: SubqueryExpr


@dataclass
class SubqueryExpr(Expression):
    """A parenthesized subquery."""

    query: SelectStmt


@dataclass
class CaseExpr(Expression):
    """CASE [expr] WHEN ... THEN ... ELSE ... END."""

    operand: Expression | None = None
    when_clauses: list[WhenClause] = field(default_factory=list)
    else_expr: Expression | None = None


@dataclass
class WhenClause(Node):
    """A single WHEN condition THEN result."""

    condition: Expression
    result: Expression


@dataclass
class TableRef(Node):
    """A table reference, optionally aliased."""

    name: str
    alias: str | None = None
    schema: str | None = None

    @property
    def effective_name(self) -> str:
        return self.alias if self.alias else self.name


@dataclass
class JoinClause(Node):
    """A JOIN clause between tables."""

    join_type: str  # INNER, LEFT, RIGHT, FULL, CROSS
    table: TableRef
    condition: Expression | None = None


@dataclass
class WhereClause(Node):
    """WHERE clause wrapping a condition expression."""

    condition: Expression


@dataclass
class GroupByClause(Node):
    """GROUP BY clause with column list."""

    columns: list[Expression] = field(default_factory=list)


@dataclass
class OrderByItem(Node):
    """A single ORDER BY item with direction."""

    expr: Expression
    ascending: bool = True
    nulls_first: bool | None = None


@dataclass
class OrderByClause(Node):
    """ORDER BY clause with ordered items."""

    items: list[OrderByItem] = field(default_factory=list)


@dataclass
class HavingClause(Node):
    """HAVING clause wrapping a condition."""

    condition: Expression


@dataclass
class LimitClause(Node):
    """LIMIT and optional OFFSET."""

    limit: int
    offset: int = 0


@dataclass
class SelectStmt(Node):
    """A complete SELECT statement."""

    columns: list[Expression] = field(default_factory=list)
    from_table: TableRef | None = None
    joins: list[JoinClause] = field(default_factory=list)
    where: WhereClause | None = None
    group_by: GroupByClause | None = None
    having: HavingClause | None = None
    order_by: OrderByClause | None = None
    limit: LimitClause | None = None
    distinct: bool = False


@dataclass
class InsertStmt(Node):
    """INSERT INTO table (cols) VALUES (...)."""

    table: TableRef
    columns: list[str] = field(default_factory=list)
    values: list[list[Expression]] = field(default_factory=list)
    select: SelectStmt | None = None


@dataclass
class Assignment(Node):
    """column = expression for UPDATE SET."""

    column: str
    value: Expression


@dataclass
class UpdateStmt(Node):
    """UPDATE table SET assignments WHERE condition."""

    table: TableRef
    assignments: list[Assignment] = field(default_factory=list)
    where: WhereClause | None = None


@dataclass
class DeleteStmt(Node):
    """DELETE FROM table WHERE condition."""

    table: TableRef
    where: WhereClause | None = None


@dataclass
class ColumnDef(Node):
    """Column definition for CREATE TABLE."""

    name: str
    data_type: str
    nullable: bool = True
    primary_key: bool = False
    default: Expression | None = None


@dataclass
class CreateTableStmt(Node):
    """CREATE TABLE statement."""

    table: TableRef
    columns: list[ColumnDef] = field(default_factory=list)
    if_not_exists: bool = False


@dataclass
class DropTableStmt(Node):
    """DROP TABLE statement."""

    table: TableRef
    if_exists: bool = False


@dataclass
class UnionStmt(Node):
    """UNION [ALL] of two SELECT statements."""

    left: SelectStmt
    right: SelectStmt | UnionStmt
    all: bool = False


def walk(node: Node) -> list[Node]:
    """Recursively collect all child nodes."""
    result: list[Node] = [node]
    for attr_val in vars(node).values():
        if isinstance(attr_val, Node):
            result.extend(walk(attr_val))
        elif isinstance(attr_val, list):
            for item in attr_val:
                if isinstance(item, Node):
                    result.extend(walk(item))
    return result


def find_nodes(root: Node, node_type: type) -> list[Node]:
    """Find all nodes of a specific type in the tree."""
    return [n for n in walk(root) if isinstance(n, node_type)]


def transform(node: Node, fn: Any) -> Node:
    """Apply a transformation function to each node bottom-up."""
    for attr_name, attr_val in vars(node).items():
        if isinstance(attr_val, Node):
            setattr(node, attr_name, transform(attr_val, fn))
        elif isinstance(attr_val, list):
            new_list = []
            for item in attr_val:
                if isinstance(item, Node):
                    new_list.append(transform(item, fn))
                else:
                    new_list.append(item)
            setattr(node, attr_name, new_list)
    return fn(node)
