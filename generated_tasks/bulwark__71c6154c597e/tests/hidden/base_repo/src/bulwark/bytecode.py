"""Bytecode opcodes and instruction encoding for the rule engine.

The engine is a small stack machine. Each rule compiles to a contiguous
slice of instructions; a phase is a list of (rule, slice) pairs.

An ``Instr`` is a 4-tuple ``(op, arg, lineno, col)``. The ``arg``
slot is overloaded depending on the opcode -- for :class:`Op.LOAD_CONST`
it's an index into the constant pool, for :class:`Op.JUMP` it's a
relative offset, for :class:`Op.LOAD_PATH` it's a path-id, etc.

The engine never mutates instruction tuples; loaders share constant
pools across rules within a single ruleset.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum


class Op(IntEnum):
    # Stack manipulation
    LOAD_CONST = 1   # arg = const-pool index
    LOAD_PATH = 2    # arg = path-id (resolved by engine at runtime)
    LOAD_BUILTIN = 3 # arg = builtin-id; consumes N args, pushes 1 result
    POP = 4

    # Boolean / comparison
    NOT = 10
    EQ = 11
    NEQ = 12
    LT = 13
    LE = 14
    GT = 15
    GE = 16
    MATCHES = 17     # arg = regex-pool index (regex is the rhs constant)
    IN_LIST = 18
    IN_CIDR = 19     # specialized form: rhs is a CIDR trie id

    # Control flow within a single rule
    JUMP_IF_FALSE = 30  # arg = relative offset (signed)
    JUMP_IF_TRUE = 31
    JUMP = 32

    # End markers
    EMIT = 40           # arg = action-id (resolved); engine records the verdict
    HALT = 41           # rule decided "no match"; engine moves to next rule


@dataclass(frozen=True, slots=True)
class Instr:
    op: Op
    arg: int = 0


@dataclass(frozen=True, slots=True)
class CompiledAction:
    """An action call resolved to a name and frozen kwargs.

    Action arguments are constant-folded at compile time. Anything that
    can't be folded is rejected by :mod:`bulwark.compiler` -- actions
    don't have side effects on the predicate evaluation, so they take
    only literal values.
    """

    name: str
    kwargs: tuple[tuple[str, object], ...]


@dataclass(frozen=True, slots=True)
class CompiledRule:
    name: str
    code: tuple[Instr, ...]
    consts: tuple[object, ...]
    action: CompiledAction


@dataclass(frozen=True, slots=True)
class CompiledPhase:
    name: str
    rules: tuple[CompiledRule, ...]


@dataclass(frozen=True, slots=True)
class CompiledProgram:
    phases: tuple[CompiledPhase, ...]
    # The compiler hands the engine the version it pinned at compile
    # time so the audit log can reference it. Filled in by the loader,
    # not by the compiler itself.
    version: str = ""
