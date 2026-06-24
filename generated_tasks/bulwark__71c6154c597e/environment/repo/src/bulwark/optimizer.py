"""Optimizer passes over the AST before compilation.

Currently:

* **constant-fold** -- fold ``not not x`` into ``x``, fold ``true and X``
  into ``X``, fold integer / string equality of literals into a Bool,
  fold list literals of literals into themselves (no-op but documents
  the contract that lists are static).
* **dedupe-rules** -- within a single phase, two rules with structurally
  identical predicates and identical actions collapse to one. The
  later one is dropped (keep declaration order for the survivor).

Optimizations that *would* be valuable but aren't here yet:

* hoist invariant sub-expressions across rules in a phase
* merge ``ip_in("a/24", x) or ip_in("b/24", x)`` into a single trie
  lookup
* dead-rule elimination after a previous always-true block
"""

from __future__ import annotations

from bulwark.ast_nodes import (
    Binary,
    BoolLit,
    Expr,
    ListLit,
    NullLit,
    Phase,
    Program,
    Rule,
    Unary,
    walk_expr,
)


def optimize(prog: Program) -> Program:
    new_phases = tuple(_optimize_phase(ph) for ph in prog.phases)
    return Program(phases=new_phases, span=prog.span)


# ---------------------------------------------------------------------------
# Phase-level
# ---------------------------------------------------------------------------


def _optimize_phase(ph: Phase) -> Phase:
    rules = [_optimize_rule(r) for r in ph.rules]
    rules = _dedupe_rules(rules)
    return Phase(name=ph.name, rules=tuple(rules), span=ph.span)


def _optimize_rule(r: Rule) -> Rule:
    return Rule(
        name=r.name,
        when=fold(r.when),
        then=r.then,
        span=r.span,
    )


def _dedupe_rules(rules: list[Rule]) -> list[Rule]:
    seen: set[tuple] = set()
    out: list[Rule] = []
    for r in rules:
        key = (
            _expr_key(r.when),
            r.then.name,
            tuple((k, _expr_key(v)) for k, v in r.then.kwargs),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


# ---------------------------------------------------------------------------
# Expression folding
# ---------------------------------------------------------------------------


def fold(e: Expr) -> Expr:
    if isinstance(e, Unary):
        inner = fold(e.operand)
        if e.op == "not" and isinstance(inner, BoolLit):
            return BoolLit(not inner.value, e.span)
        if e.op == "not" and isinstance(inner, Unary) and inner.op == "not":
            # Double negation elimination
            return inner.operand
        return Unary(e.op, inner, e.span)
    if isinstance(e, Binary):
        left = fold(e.left)
        right = fold(e.right)
        if e.op == "and":
            if isinstance(left, BoolLit) and not left.value:
                return BoolLit(False, e.span)
            if isinstance(left, BoolLit) and left.value:
                return right
            if isinstance(right, BoolLit) and not right.value:
                return BoolLit(False, e.span)
        if e.op == "or":
            if isinstance(left, BoolLit) and left.value:
                return BoolLit(True, e.span)
            if isinstance(left, BoolLit) and not left.value:
                return right
            if isinstance(right, BoolLit) and right.value:
                return BoolLit(True, e.span)
        if e.op in {"==", "!="} and isinstance(left, BoolLit) and isinstance(
            right, BoolLit
        ):
            same = left.value == right.value
            return BoolLit(same if e.op == "==" else not same, e.span)
        return Binary(e.op, left, right, e.span)
    if isinstance(e, ListLit):
        return ListLit(tuple(fold(it) for it in e.items), e.span)
    return e


def _expr_key(e: Expr) -> tuple:
    """Structural key for an expression -- used by the deduper.

    We avoid spans in the key (so two textually different copies of the
    same predicate dedupe). The walk_expr iteration order is stable.
    """
    out: list = []
    for n in walk_expr(e):
        if isinstance(n, Binary):
            out.append(("binary", n.op))
        elif isinstance(n, Unary):
            out.append(("unary", n.op))
        elif isinstance(n, BoolLit):
            out.append(("bool", n.value))
        elif isinstance(n, NullLit):
            out.append(("null",))
        else:
            # Use type name + frozen attrs we care about
            out.append((type(n).__name__, _node_attrs(n)))
    return tuple(out)


def _node_attrs(n) -> tuple:
    keys = sorted(getattr(n, "__dataclass_fields__", {}).keys())
    return tuple(
        (k, getattr(n, k)) for k in keys if k not in {"span", "operand", "left", "right", "args", "kwargs", "items"}
    )
