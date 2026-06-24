"""Bytecode disassembler.

A debugging aid; the engine doesn't depend on it. Render a compiled
program as a human-readable listing similar to what ``dis.dis`` prints
for CPython bytecode.
"""

from __future__ import annotations

from bulwark.bytecode import CompiledPhase, CompiledProgram, CompiledRule, Op


def disassemble_program(prog: CompiledProgram) -> str:
    parts: list[str] = []
    if prog.version:
        parts.append(f"# ruleset version {prog.version}")
    for ph in prog.phases:
        parts.append(disassemble_phase(ph))
    return "\n".join(parts)


def disassemble_phase(phase: CompiledPhase) -> str:
    lines = [f"phase {phase.name}:"]
    for rule in phase.rules:
        lines.append(disassemble_rule(rule, indent="  "))
    return "\n".join(lines)


def disassemble_rule(rule: CompiledRule, *, indent: str = "") -> str:
    lines = [f"{indent}rule {rule.name}:"]
    pad = indent + "    "
    for i, ins in enumerate(rule.code):
        op_name = ins.op.name
        arg_repr = _arg_repr(ins.op, ins.arg, rule.consts)
        lines.append(f"{pad}{i:>4}  {op_name:<14} {arg_repr}")
    lines.append(f"{pad}# action: {rule.action.name}({_kw(rule.action.kwargs)})")
    return "\n".join(lines)


def _arg_repr(op: Op, arg: int, consts: tuple[object, ...]) -> str:
    if op in (Op.LOAD_CONST, Op.MATCHES, Op.LOAD_BUILTIN, Op.LOAD_PATH):
        if 0 <= arg < len(consts):
            return f"{arg}  ({consts[arg]!r})"
        return str(arg)
    if op in (Op.JUMP, Op.JUMP_IF_FALSE, Op.JUMP_IF_TRUE):
        sign = "+" if arg >= 0 else ""
        return f"{sign}{arg}"
    return str(arg)


def _kw(kwargs: tuple[tuple[str, object], ...]) -> str:
    return ", ".join(f"{k}={v!r}" for k, v in kwargs)
