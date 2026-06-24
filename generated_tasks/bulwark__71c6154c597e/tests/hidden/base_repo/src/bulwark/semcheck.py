"""Semantic checker for the rule DSL.

Walks an AST and reports a list of diagnostics for things like:

* unknown path roots (``foo.bar`` where ``foo`` isn't registered)
* type-mismatched comparisons (``method == 5``)
* arity mismatches on built-ins (``len("a", "b")``)
* unknown action names (``then warp()``)
* invalid phase names (``phase nope``)
* a regex-match where the right-hand side isn't a regex literal

The check is best-effort: when a sub-expression's type can't be
inferred, we propagate :class:`TAny` and keep going so we can collect
multiple errors in a single pass instead of bailing on the first one.
"""

from __future__ import annotations

from dataclasses import dataclass, field

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
from bulwark.errors import Diagnostic
from bulwark.registry import ACTIONS, BUILTINS, PATH_ROOTS
from bulwark.types import (
    TAny,
    TBool,
    TFloat,
    TInt,
    TList,
    TNever,
    TNull,
    TRegex,
    TString,
    Type,
    fmt as fmt_type,
    is_subtype,
    join,
)


VALID_PHASES = frozenset({"pre_route", "post_route", "response"})


@dataclass
class CheckResult:
    diagnostics: list[Diagnostic] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not any(d.severity == "error" for d in self.diagnostics)


def check(program: Program) -> CheckResult:
    """Run the type/shape checker on ``program`` and return diagnostics."""
    res = CheckResult()
    seen_phases: set[str] = set()
    for ph in program.phases:
        _check_phase(ph, res, seen_phases)
    return res


# ---------------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------------


def _err(res: CheckResult, msg: str, span) -> None:
    res.diagnostics.append(Diagnostic(message=msg, span=span, severity="error"))


def _warn(res: CheckResult, msg: str, span) -> None:
    res.diagnostics.append(Diagnostic(message=msg, span=span, severity="warning"))


def _check_phase(ph: Phase, res: CheckResult, seen: set[str]) -> None:
    if ph.name not in VALID_PHASES:
        _err(res, f"unknown phase {ph.name!r}", ph.span)
    if ph.name in seen:
        _warn(res, f"phase {ph.name!r} repeated; rules will be merged", ph.span)
    seen.add(ph.name)
    rule_names: set[str] = set()
    for r in ph.rules:
        if r.name in rule_names:
            _err(res, f"duplicate rule name {r.name!r}", r.span)
        rule_names.add(r.name)
        _check_rule(r, res)


def _check_rule(r: Rule, res: CheckResult) -> None:
    when_t = _check_expr(r.when, res)
    if not is_subtype(when_t, TBool()) and not isinstance(when_t, TAny):
        _err(
            res,
            f"`when` predicate must be bool, got {fmt_type(when_t)}",
            r.when.span,
        )
    _check_action(r.then, res)


def _check_action(a: Action, res: CheckResult) -> None:
    sig = ACTIONS.get(a.name)
    if sig is None:
        _err(res, f"unknown action {a.name!r}", a.span)
        return
    if len(a.args) != len(sig.positional):
        _err(
            res,
            f"action {a.name!r} expects {len(sig.positional)} positional args, got {len(a.args)}",
            a.span,
        )
    for actual, expected in zip(a.args, sig.positional):
        actual_t = _check_expr(actual, res)
        if not is_subtype(actual_t, expected):
            _err(
                res,
                f"argument type mismatch: expected {fmt_type(expected)}, got {fmt_type(actual_t)}",
                actual.span,
            )
    for kw, val in a.kwargs:
        if kw not in sig.kwargs:
            _err(res, f"unknown keyword {kw!r} for action {a.name!r}", val.span)
            _check_expr(val, res)
            continue
        val_t = _check_expr(val, res)
        if not is_subtype(val_t, sig.kwargs[kw]):
            _err(
                res,
                f"argument {kw!r} expected {fmt_type(sig.kwargs[kw])}, got {fmt_type(val_t)}",
                val.span,
            )


# ---------------------------------------------------------------------------
# Expression typing
# ---------------------------------------------------------------------------


_COMPARISON_OPS = {"==", "!=", "<", "<=", ">", ">="}
_LOGICAL_OPS = {"and", "or"}


def _check_expr(e: Expr, res: CheckResult) -> Type:
    if isinstance(e, IntLit):
        return TInt()
    if isinstance(e, FloatLit):
        return TFloat()
    if isinstance(e, StringLit):
        return TString()
    if isinstance(e, RegexLit):
        return TRegex()
    if isinstance(e, BoolLit):
        return TBool()
    if isinstance(e, NullLit):
        return TNull()
    if isinstance(e, Path):
        return _check_path(e, res)
    if isinstance(e, ListLit):
        return _check_list(e, res)
    if isinstance(e, Unary):
        inner = _check_expr(e.operand, res)
        if e.op == "not":
            if not is_subtype(inner, TBool()) and not isinstance(inner, TAny):
                _err(
                    res,
                    f"`not` expects bool, got {fmt_type(inner)}",
                    e.operand.span,
                )
            return TBool()
        return TAny()
    if isinstance(e, Binary):
        return _check_binary(e, res)
    if isinstance(e, Call):
        return _check_call(e, res)
    return TNever()


def _check_path(p: Path, res: CheckResult) -> Type:
    root = PATH_ROOTS.get(p.parts[0])
    if root is None:
        _err(res, f"unknown path root {p.parts[0]!r}", p.span)
        return TAny()
    if len(p.parts) == 1:
        return root.bare_type
    if root.child_type is None:
        _err(res, f"path root {p.parts[0]!r} has no children", p.span)
        return TAny()
    # We allow arbitrary-depth paths under any root that has children.
    return root.child_type


def _check_list(e: ListLit, res: CheckResult) -> Type:
    if not e.items:
        return TList(TNever())
    elem: Type = TNever()
    for item in e.items:
        elem = join(elem, _check_expr(item, res))
    return TList(elem)


def _check_binary(e: Binary, res: CheckResult) -> Type:
    if e.op in _LOGICAL_OPS:
        lt = _check_expr(e.left, res)
        rt = _check_expr(e.right, res)
        for side, t in (("left", lt), ("right", rt)):
            if not is_subtype(t, TBool()) and not isinstance(t, TAny):
                _err(res, f"`{e.op}` {side} side expects bool, got {fmt_type(t)}", e.span)
        return TBool()
    if e.op == "matches":
        lt = _check_expr(e.left, res)
        rt = _check_expr(e.right, res)
        if not is_subtype(lt, TString()) and not isinstance(lt, TAny):
            _err(res, f"`matches` left side must be string, got {fmt_type(lt)}", e.left.span)
        if not isinstance(rt, TRegex):
            _err(res, "`matches` right side must be a regex literal", e.right.span)
        return TBool()
    if e.op == "in":
        lt = _check_expr(e.left, res)
        rt = _check_expr(e.right, res)
        if not isinstance(rt, TList) and not isinstance(rt, TAny):
            _err(res, f"`in` right side must be a list, got {fmt_type(rt)}", e.right.span)
        # element/CIDR string compatibility is checked at compile time
        # for IP rules; here we just keep going.
        del lt
        return TBool()
    if e.op in _COMPARISON_OPS:
        lt = _check_expr(e.left, res)
        rt = _check_expr(e.right, res)
        if (
            not isinstance(lt, TAny)
            and not isinstance(rt, TAny)
            and not _comparable(lt, rt)
        ):
            _err(
                res,
                f"cannot compare {fmt_type(lt)} and {fmt_type(rt)}",
                e.span,
            )
        return TBool()
    return TAny()


def _comparable(a: Type, b: Type) -> bool:
    # Numeric on numeric is fine.
    numeric = (TBool, TInt, TFloat)
    if isinstance(a, numeric) and isinstance(b, numeric):
        return True
    # Same nominal type is fine.
    if type(a) is type(b):
        return True
    # null is comparable with anything (==/!= allowed)
    if isinstance(a, TNull) or isinstance(b, TNull):
        return True
    return False


def _check_call(e: Call, res: CheckResult) -> Type:
    fn = BUILTINS.get(e.name)
    if fn is None:
        _err(res, f"unknown function {e.name!r}", e.span)
        for a in e.args:
            _check_expr(a, res)
        return TAny()
    if e.kwargs:
        _err(res, f"function {e.name!r} does not accept keyword arguments", e.span)
    expected_n = len(fn.param_types)
    if fn.variadic_tail is None and len(e.args) != expected_n:
        _err(
            res,
            f"function {e.name!r} expects {expected_n} args, got {len(e.args)}",
            e.span,
        )
    elif fn.variadic_tail is not None and len(e.args) < expected_n:
        _err(
            res,
            f"function {e.name!r} expects at least {expected_n} args, got {len(e.args)}",
            e.span,
        )
    for i, arg in enumerate(e.args):
        actual = _check_expr(arg, res)
        if i < expected_n:
            expected = fn.param_types[i]
        elif fn.variadic_tail is not None:
            expected = fn.variadic_tail
        else:
            continue
        if not is_subtype(actual, expected):
            _err(
                res,
                f"argument {i + 1} of {e.name!r}: expected {fmt_type(expected)}, got {fmt_type(actual)}",
                arg.span,
            )
    return fn.return_type
