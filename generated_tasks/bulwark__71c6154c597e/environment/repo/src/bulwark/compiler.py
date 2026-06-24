"""Compile the AST to bytecode.

The compiler walks each rule's ``when`` predicate and emits a stream
of :class:`bulwark.bytecode.Instr` ending in either ``EMIT`` (the
predicate evaluated truthy and the rule fires) or ``HALT`` (the
predicate evaluated falsy and the engine moves on).

Action argument values must be literals (or fold-to-literal at the
optimizer level). Anything that needs runtime data has no business
in an action argument.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

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
from bulwark.bytecode import (
    CompiledAction,
    CompiledPhase,
    CompiledProgram,
    CompiledRule,
    Instr,
    Op,
)
from bulwark.errors import CompileError
from bulwark.registry import ACTIONS, BUILTINS


def compile_program(prog: Program) -> CompiledProgram:
    return CompiledProgram(
        phases=tuple(_compile_phase(ph) for ph in prog.phases),
    )


def _compile_phase(ph: Phase) -> CompiledPhase:
    return CompiledPhase(
        name=ph.name,
        rules=tuple(_compile_rule(r) for r in ph.rules),
    )


# ---------------------------------------------------------------------------
# Per-rule compilation
# ---------------------------------------------------------------------------


@dataclass
class _RuleCtx:
    code: list[Instr] = field(default_factory=list)
    consts: list[Any] = field(default_factory=list)

    def emit(self, op: Op, arg: int = 0) -> int:
        self.code.append(Instr(op, arg))
        return len(self.code) - 1

    def add_const(self, value: Any) -> int:
        # Constants are deduped by ``(type, value)``. We use type to
        # keep ``True`` separate from ``1``.
        for i, c in enumerate(self.consts):
            if type(c) is type(value) and c == value:
                return i
        self.consts.append(value)
        return len(self.consts) - 1


def _compile_rule(r: Rule) -> CompiledRule:
    ctx = _RuleCtx()
    _compile_expr(r.when, ctx)
    # If the predicate evaluated falsy, halt; otherwise emit.
    halt_jump = ctx.emit(Op.JUMP_IF_FALSE, 0)  # backpatched
    action = _compile_action(r.then)
    ctx.emit(Op.EMIT, 0)
    end_jump = ctx.emit(Op.JUMP, 0)
    halt_target = len(ctx.code)
    ctx.emit(Op.HALT)
    final = len(ctx.code)
    # Backpatch jumps to relative offsets.
    ctx.code[halt_jump] = Instr(Op.JUMP_IF_FALSE, halt_target - halt_jump - 1)
    ctx.code[end_jump] = Instr(Op.JUMP, final - end_jump - 1)
    return CompiledRule(
        name=r.name,
        code=tuple(ctx.code),
        consts=tuple(ctx.consts),
        action=action,
    )


def _compile_action(a: Action) -> CompiledAction:
    sig = ACTIONS.get(a.name)
    if sig is None:
        raise CompileError(f"unknown action {a.name!r}", a.span)
    if a.args:
        raise CompileError(
            f"action {a.name!r} takes only keyword arguments", a.span
        )
    folded: list[tuple[str, object]] = []
    for k, v in a.kwargs:
        folded.append((k, _fold_to_literal(v)))
    return CompiledAction(a.name, tuple(folded))


def _fold_to_literal(e: Expr) -> object:
    if isinstance(e, IntLit):
        return e.value
    if isinstance(e, FloatLit):
        return e.value
    if isinstance(e, StringLit):
        return e.value
    if isinstance(e, BoolLit):
        return e.value
    if isinstance(e, NullLit):
        return None
    if isinstance(e, ListLit):
        return tuple(_fold_to_literal(it) for it in e.items)
    raise CompileError(
        f"action argument must be a literal, got {type(e).__name__}", e.span
    )


# ---------------------------------------------------------------------------
# Expression code generation
# ---------------------------------------------------------------------------


def _compile_expr(e: Expr, ctx: _RuleCtx) -> None:
    if isinstance(e, IntLit):
        ctx.emit(Op.LOAD_CONST, ctx.add_const(e.value))
        return
    if isinstance(e, FloatLit):
        ctx.emit(Op.LOAD_CONST, ctx.add_const(e.value))
        return
    if isinstance(e, StringLit):
        ctx.emit(Op.LOAD_CONST, ctx.add_const(e.value))
        return
    if isinstance(e, BoolLit):
        ctx.emit(Op.LOAD_CONST, ctx.add_const(e.value))
        return
    if isinstance(e, NullLit):
        ctx.emit(Op.LOAD_CONST, ctx.add_const(None))
        return
    if isinstance(e, RegexLit):
        # Regex literals push themselves as constants -- the MATCHES
        # opcode reads from the constant slot above the haystack.
        ctx.emit(Op.LOAD_CONST, ctx.add_const(("__regex__", e.pattern)))
        return
    if isinstance(e, Path):
        # Path id: we use the dotted form as the key. The engine
        # resolves "header.x" → the right runtime accessor.
        path_key = ".".join(e.parts)
        ctx.emit(Op.LOAD_PATH, ctx.add_const(path_key))
        return
    if isinstance(e, ListLit):
        # Lists are constants only if every item is a literal.
        try:
            value = tuple(_fold_to_literal(it) for it in e.items)
        except CompileError:
            raise
        ctx.emit(Op.LOAD_CONST, ctx.add_const(value))
        return
    if isinstance(e, Unary):
        _compile_expr(e.operand, ctx)
        if e.op == "not":
            ctx.emit(Op.NOT)
            return
        raise CompileError(f"unknown unary operator {e.op!r}", e.span)
    if isinstance(e, Binary):
        _compile_binary(e, ctx)
        return
    if isinstance(e, Call):
        _compile_call(e, ctx)
        return
    raise CompileError(f"can't compile {type(e).__name__}", e.span)


_BINARY_OPS = {
    "==": Op.EQ,
    "!=": Op.NEQ,
    "<": Op.LT,
    "<=": Op.LE,
    ">": Op.GT,
    ">=": Op.GE,
}


def _compile_binary(e: Binary, ctx: _RuleCtx) -> None:
    if e.op == "and":
        _compile_expr(e.left, ctx)
        # Short-circuit: jump-on-false to the falsy result placeholder.
        # We don't bother optimizing that further here; the engine sees
        # the same end value either way.
        jmp = ctx.emit(Op.JUMP_IF_FALSE, 0)
        # If left was true, evaluate right.
        _compile_expr(e.right, ctx)
        end_jmp = ctx.emit(Op.JUMP, 0)
        # On false-branch: push False directly.
        false_target = len(ctx.code)
        ctx.emit(Op.LOAD_CONST, ctx.add_const(False))
        end = len(ctx.code)
        ctx.code[jmp] = Instr(Op.JUMP_IF_FALSE, false_target - jmp - 1)
        ctx.code[end_jmp] = Instr(Op.JUMP, end - end_jmp - 1)
        return
    if e.op == "or":
        _compile_expr(e.left, ctx)
        jmp = ctx.emit(Op.JUMP_IF_TRUE, 0)
        _compile_expr(e.right, ctx)
        end_jmp = ctx.emit(Op.JUMP, 0)
        true_target = len(ctx.code)
        ctx.emit(Op.LOAD_CONST, ctx.add_const(True))
        end = len(ctx.code)
        ctx.code[jmp] = Instr(Op.JUMP_IF_TRUE, true_target - jmp - 1)
        ctx.code[end_jmp] = Instr(Op.JUMP, end - end_jmp - 1)
        return
    if e.op == "matches":
        _compile_expr(e.left, ctx)
        if not isinstance(e.right, RegexLit):
            raise CompileError("`matches` rhs must be a regex literal", e.span)
        regex_idx = ctx.add_const(("__regex__", e.right.pattern))
        ctx.emit(Op.MATCHES, regex_idx)
        return
    if e.op == "in":
        _compile_expr(e.left, ctx)
        _compile_expr(e.right, ctx)
        ctx.emit(Op.IN_LIST)
        return
    if e.op in _BINARY_OPS:
        _compile_expr(e.left, ctx)
        _compile_expr(e.right, ctx)
        ctx.emit(_BINARY_OPS[e.op])
        return
    raise CompileError(f"unknown binary operator {e.op!r}", e.span)


def _compile_call(e: Call, ctx: _RuleCtx) -> None:
    sig = BUILTINS.get(e.name)
    if sig is None:
        raise CompileError(f"unknown function {e.name!r}", e.span)
    for arg in e.args:
        _compile_expr(arg, ctx)
    builtin_idx = ctx.add_const(("__builtin__", e.name, len(e.args)))
    ctx.emit(Op.LOAD_BUILTIN, builtin_idx)
