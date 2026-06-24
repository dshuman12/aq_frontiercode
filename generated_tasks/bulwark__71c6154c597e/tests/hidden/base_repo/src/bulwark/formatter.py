"""Canonical pretty-printer for the rule DSL.

The formatter is structural: it walks the AST and prints a normalized
form. Round-tripping is exact at the AST level -- re-parsing the output
of :func:`format_program` and formatting again yields byte-identical
text.
"""

from __future__ import annotations

from bulwark.ast_nodes import (
    Action,
    Binary,
    BoolLit,
    Call,
    Expr,
    FloatLit,
    IntLit,
    ListLit,
    NullLit,
    Path,
    Phase,
    Program,
    RegexLit,
    Rule,
    StringLit,
    Unary,
)


_INDENT = "    "


def format_program(prog: Program) -> str:
    if not prog.phases:
        return ""
    parts = [_format_phase(ph) for ph in prog.phases]
    return "\n\n".join(parts) + "\n"


def _format_phase(ph: Phase) -> str:
    if not ph.rules:
        return f"phase {ph.name} {{}}"
    body = "\n".join(_format_rule(r) for r in ph.rules)
    return f"phase {ph.name} {{\n{body}\n}}"


def _format_rule(r: Rule) -> str:
    when = _format_expr(r.when)
    then = _format_action(r.then)
    return (
        f"{_INDENT}rule {r.name} {{\n"
        f"{_INDENT}{_INDENT}when {when}\n"
        f"{_INDENT}{_INDENT}then {then}\n"
        f"{_INDENT}}}"
    )


def _format_action(a: Action) -> str:
    args = _format_args(a.args, a.kwargs)
    return f"{a.name}({args})"


# ---------------------------------------------------------------------------
# Expressions -- operator precedence drives parenthesization
# ---------------------------------------------------------------------------


# Higher number = tighter binding.
_PREC = {
    "or": 1,
    "and": 2,
    "not": 3,
    "==": 4,
    "!=": 4,
    "<": 4,
    "<=": 4,
    ">": 4,
    ">=": 4,
    "matches": 4,
    "in": 4,
}


def _format_expr(e: Expr, parent_prec: int = 0) -> str:
    if isinstance(e, IntLit):
        return str(e.value)
    if isinstance(e, FloatLit):
        return repr(e.value)
    if isinstance(e, StringLit):
        return _string_lit(e.value)
    if isinstance(e, RegexLit):
        return f"/{e.pattern}/"
    if isinstance(e, BoolLit):
        return "true" if e.value else "false"
    if isinstance(e, NullLit):
        return "null"
    if isinstance(e, Path):
        return ".".join(e.parts)
    if isinstance(e, Unary):
        prec = _PREC[e.op]
        inner = _format_expr(e.operand, prec)
        text = f"{e.op} {inner}"
        return _wrap(text, prec, parent_prec)
    if isinstance(e, Binary):
        prec = _PREC[e.op]
        left = _format_expr(e.left, prec)
        right = _format_expr(e.right, prec + 1)  # right-associate ties
        text = f"{left} {e.op} {right}"
        return _wrap(text, prec, parent_prec)
    if isinstance(e, Call):
        args = _format_args(e.args, e.kwargs)
        return f"{e.name}({args})"
    if isinstance(e, ListLit):
        return "[" + ", ".join(_format_expr(it) for it in e.items) + "]"
    raise AssertionError(f"unknown expression node: {type(e).__name__}")


def _wrap(text: str, prec: int, parent_prec: int) -> str:
    return f"({text})" if prec < parent_prec else text


def _format_args(
    args: tuple[Expr, ...],
    kwargs: tuple[tuple[str, Expr], ...],
) -> str:
    parts: list[str] = [_format_expr(a) for a in args]
    parts.extend(f"{k}={_format_expr(v)}" for k, v in kwargs)
    return ", ".join(parts)


def _string_lit(value: str) -> str:
    out = ['"']
    for ch in value:
        if ch == '"':
            out.append('\\"')
        elif ch == "\\":
            out.append("\\\\")
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\t":
            out.append("\\t")
        elif ch == "\r":
            out.append("\\r")
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)
