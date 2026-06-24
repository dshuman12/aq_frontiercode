"""AST node dataclasses for the rule DSL.

A program is a list of phase blocks. A phase block contains an ordered
list of rules. A rule has a ``when`` predicate (an expression) and a
``then`` action (a call to a built-in like ``block``, ``allow``,
``limit``, ``tag``, ``challenge``).

Expressions form a small lattice:

* literals (int, float, string, regex, bool, null)
* paths (``header.x-internal``, ``ident.client_ip``, ``body.user.id``)
* unary (``not``)
* binary (logical and/or; comparisons; ``matches``; ``in``)
* calls (``ip_in("1.2.3.0/24", ident.client_ip)``)

Every node carries a ``span`` so diagnostics can point back into source.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Union

from bulwark.span import Span


# ---------------------------------------------------------------------------
# Expressions
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class IntLit:
    value: int
    span: Span


@dataclass(frozen=True, slots=True)
class FloatLit:
    value: float
    span: Span


@dataclass(frozen=True, slots=True)
class StringLit:
    value: str
    span: Span


@dataclass(frozen=True, slots=True)
class RegexLit:
    pattern: str
    span: Span


@dataclass(frozen=True, slots=True)
class BoolLit:
    value: bool
    span: Span


@dataclass(frozen=True, slots=True)
class NullLit:
    span: Span


@dataclass(frozen=True, slots=True)
class Path:
    """A dotted path like ``header.x-token`` or ``ident.client_ip``.

    The first segment is the *root* (``header``, ``ident``, ``body``,
    ``query``, ``cookie``, ``url``, ``method``, ``path``). The remaining
    segments are case-sensitive keys; the engine handles
    case-insensitivity for header roots.
    """

    parts: tuple[str, ...]
    span: Span


@dataclass(frozen=True, slots=True)
class ListLit:
    items: tuple["Expr", ...]
    span: Span


@dataclass(frozen=True, slots=True)
class Unary:
    op: str  # "not"
    operand: "Expr"
    span: Span


@dataclass(frozen=True, slots=True)
class Binary:
    op: str  # "and" "or" "==" "!=" "<" "<=" ">" ">=" "matches" "in"
    left: "Expr"
    right: "Expr"
    span: Span


@dataclass(frozen=True, slots=True)
class Call:
    name: str
    args: tuple["Expr", ...]
    kwargs: tuple[tuple[str, "Expr"], ...]
    span: Span


Expr = Union[
    IntLit,
    FloatLit,
    StringLit,
    RegexLit,
    BoolLit,
    NullLit,
    Path,
    ListLit,
    Unary,
    Binary,
    Call,
]


# ---------------------------------------------------------------------------
# Top-level
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Action:
    """An action call appears in the ``then`` clause of a rule."""

    name: str  # block | allow | tag | limit | challenge
    args: tuple[Expr, ...]
    kwargs: tuple[tuple[str, Expr], ...]
    span: Span


@dataclass(frozen=True, slots=True)
class Rule:
    name: str
    when: Expr
    then: Action
    span: Span


@dataclass(frozen=True, slots=True)
class Phase:
    """A phase block scopes a list of rules to a request lifecycle moment.

    Valid phase names: ``pre_route``, ``post_route``, ``response``.
    Validation is the typechecker's job; the parser accepts anything.
    """

    name: str
    rules: tuple[Rule, ...]
    span: Span


@dataclass(frozen=True, slots=True)
class Program:
    phases: tuple[Phase, ...]
    span: Span = field(default_factory=lambda: Span(0, 0))


# ---------------------------------------------------------------------------
# Visitor
# ---------------------------------------------------------------------------


def walk_expr(node: Expr):
    """Yield ``node`` and all descendant expression nodes, depth-first."""
    yield node
    if isinstance(node, Unary):
        yield from walk_expr(node.operand)
    elif isinstance(node, Binary):
        yield from walk_expr(node.left)
        yield from walk_expr(node.right)
    elif isinstance(node, Call):
        for a in node.args:
            yield from walk_expr(a)
        for _, v in node.kwargs:
            yield from walk_expr(v)
    elif isinstance(node, ListLit):
        for it in node.items:
            yield from walk_expr(it)


def walk_program(prog: Program):
    """Yield every expression node anywhere in ``prog``.

    Useful for cheap "find all paths", "count all regexes" passes.
    The iteration order is: phase order, rule order within phase,
    ``when`` predicate before action arguments.
    """
    for ph in prog.phases:
        for rule in ph.rules:
            yield from walk_expr(rule.when)
            for arg in rule.then.args:
                yield from walk_expr(arg)
            for _, val in rule.then.kwargs:
                yield from walk_expr(val)
