"""Stack-machine engine that executes :mod:`bulwark.bytecode`.

The engine evaluates one rule at a time. A request supplies an
:class:`Env` -- a small object that knows how to resolve paths and
invoke built-ins. The engine is pure: it doesn't import the network
stack or the audit log; it just produces a verdict.

Verdicts are :class:`bulwark.verdict.Verdict` records. The pipeline
turns them into HTTP responses.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable, Mapping

from bulwark.bytecode import CompiledPhase, CompiledProgram, CompiledRule, Instr, Op
from bulwark.errors import BulwarkRuntimeError
from bulwark.verdict import Verdict


@dataclass
class Env:
    """Per-request environment passed to the engine."""

    paths: Mapping[str, Any]
    builtins: Mapping[str, Callable[..., Any]]


@dataclass
class _Frame:
    rule: CompiledRule
    pc: int = 0
    stack: list[Any] = field(default_factory=list)


def run_phase(
    phase: CompiledPhase, env: Env, *, version: str = ""
) -> list[Verdict]:
    """Run every rule in ``phase`` and collect their verdicts (if any).

    The engine collects one verdict per matching rule; phase-level
    first-match-wins / priority logic lives in :mod:`bulwark.pipeline`.
    """
    out: list[Verdict] = []
    for rule in phase.rules:
        v = _run_rule(rule, env, phase.name, version)
        if v is not None:
            out.append(v)
    return out


def run_program(prog: CompiledProgram, env: Env) -> dict[str, list[Verdict]]:
    """Run every phase. Returns ``phase_name → list of verdicts``."""
    result: dict[str, list[Verdict]] = {}
    for ph in prog.phases:
        result[ph.name] = run_phase(ph, env, version=prog.version)
    return result


# ---------------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------------


_REGEX_CACHE: dict[str, re.Pattern[str]] = {}


def _compile_regex(pat: str) -> re.Pattern[str]:
    cached = _REGEX_CACHE.get(pat)
    if cached is not None:
        return cached
    compiled = re.compile(pat)
    _REGEX_CACHE[pat] = compiled
    return compiled


def _run_rule(
    rule: CompiledRule, env: Env, phase: str, version: str
) -> Verdict | None:
    frame = _Frame(rule=rule)
    code = rule.code
    while frame.pc < len(code):
        ins = code[frame.pc]
        op = ins.op
        if op is Op.LOAD_CONST:
            frame.stack.append(rule.consts[ins.arg])
        elif op is Op.LOAD_PATH:
            key = rule.consts[ins.arg]
            frame.stack.append(_resolve_path(env, key))
        elif op is Op.LOAD_BUILTIN:
            tag = rule.consts[ins.arg]
            assert isinstance(tag, tuple) and tag[0] == "__builtin__"
            name, argc = tag[1], tag[2]
            argv = [frame.stack.pop() for _ in range(argc)][::-1]
            fn = env.builtins.get(name)
            if fn is None:
                raise BulwarkRuntimeError(f"builtin {name!r} not registered")
            frame.stack.append(fn(*argv))
        elif op is Op.POP:
            frame.stack.pop()
        elif op is Op.NOT:
            frame.stack.append(not _truthy(frame.stack.pop()))
        elif op in _CMP_OPS:
            r = frame.stack.pop()
            l = frame.stack.pop()
            frame.stack.append(_CMP_OPS[op](l, r))
        elif op is Op.MATCHES:
            tag = rule.consts[ins.arg]
            assert isinstance(tag, tuple) and tag[0] == "__regex__"
            haystack = frame.stack.pop()
            if not isinstance(haystack, str):
                frame.stack.append(False)
            else:
                pat = _compile_regex(tag[1])
                frame.stack.append(pat.search(haystack) is not None)
        elif op is Op.IN_LIST:
            needle_list = frame.stack.pop()
            needle = frame.stack.pop()
            try:
                frame.stack.append(needle in needle_list)
            except TypeError:
                frame.stack.append(False)
        elif op is Op.JUMP:
            frame.pc += ins.arg
        elif op is Op.JUMP_IF_FALSE:
            top = frame.stack.pop()
            if not _truthy(top):
                frame.pc += ins.arg
        elif op is Op.JUMP_IF_TRUE:
            top = frame.stack.pop()
            if _truthy(top):
                frame.pc += ins.arg
        elif op is Op.EMIT:
            return Verdict(
                rule=rule.name,
                phase=phase,
                action=rule.action.name,
                kwargs=dict(rule.action.kwargs),
                version=version,
            )
        elif op is Op.HALT:
            return None
        else:
            raise BulwarkRuntimeError(f"unknown opcode {op}")
        frame.pc += 1
    return None


_CMP_OPS = {
    Op.EQ: lambda a, b: a == b,
    Op.NEQ: lambda a, b: a != b,
    Op.LT: lambda a, b: a < b,
    Op.LE: lambda a, b: a <= b,
    Op.GT: lambda a, b: a > b,
    Op.GE: lambda a, b: a >= b,
}


def _truthy(v: Any) -> bool:
    if v is None or v is False:
        return False
    if v == 0 or v == "" or v == ():
        return False
    return True


def _resolve_path(env: Env, key: str) -> Any:
    """Resolve ``"header.x-token"`` against ``env.paths``.

    The resolver is intentionally simple: env.paths is a flat dict of
    fully-dotted keys. The pipeline builds it up from the request.
    """
    direct = env.paths.get(key)
    if direct is not None:
        return direct
    # Headers do case-insensitive child lookup.
    if "." in key:
        head, _, rest = key.partition(".")
        if head == "header":
            for k, v in env.paths.items():
                if k.lower() == key.lower():
                    return v
    return None
