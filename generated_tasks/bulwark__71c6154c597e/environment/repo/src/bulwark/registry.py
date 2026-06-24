"""Path roots and built-in atom signatures.

This module is the registry of "things rules can name". It serves
two clients:

* the typechecker (:mod:`bulwark.semcheck`) consults it to decide the
  type of a path or a built-in call, and to verify argument arity.
* the compiler (:mod:`bulwark.compiler`) consults it to emit the right
  opcode for path access and built-in dispatch.

Adding a new built-in is one entry in :data:`BUILTINS`.
Adding a new path root is one entry in :data:`PATH_ROOTS`.
"""

from __future__ import annotations

from dataclasses import dataclass

from bulwark.types import (
    TAny,
    TBool,
    TFloat,
    TInt,
    TList,
    TNull,
    TRegex,
    TString,
    Type,
)


# ---------------------------------------------------------------------------
# Path roots
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class PathRoot:
    """Describes a top-level path identifier and how to resolve children."""

    name: str
    # Type of a bare path (e.g. ``path`` on its own)
    bare_type: Type
    # Type of a one-level deep access (e.g. ``header.x``).
    # If ``None``, the bare path has no children.
    child_type: Type | None
    # If True, child name lookup is ASCII case-insensitive (e.g. headers).
    case_insensitive: bool = False


PATH_ROOTS: dict[str, PathRoot] = {
    "method": PathRoot("method", TString(), None),
    "path": PathRoot("path", TString(), None),
    "query": PathRoot("query", TAny(), TString(), case_insensitive=False),
    "header": PathRoot("header", TAny(), TString(), case_insensitive=True),
    "cookie": PathRoot("cookie", TAny(), TString(), case_insensitive=False),
    "body": PathRoot("body", TAny(), TAny(), case_insensitive=False),
    "url": PathRoot(
        "url",
        TAny(),
        TString(),
        case_insensitive=False,
    ),
    "ident": PathRoot("ident", TAny(), TString(), case_insensitive=False),
}


# ---------------------------------------------------------------------------
# Built-in functions (callable from rule predicates)
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Builtin:
    name: str
    param_types: tuple[Type, ...]
    return_type: Type
    # Some builtins accept any number of trailing arguments -- set
    # ``variadic_tail`` to the type of those extras.
    variadic_tail: Type | None = None


BUILTINS: dict[str, Builtin] = {
    "len": Builtin("len", (TString(),), TInt()),
    "lower": Builtin("lower", (TString(),), TString()),
    "upper": Builtin("upper", (TString(),), TString()),
    "starts_with": Builtin("starts_with", (TString(), TString()), TBool()),
    "ends_with": Builtin("ends_with", (TString(), TString()), TBool()),
    "contains": Builtin("contains", (TString(), TString()), TBool()),
    "ip_in": Builtin("ip_in", (TString(), TString()), TBool()),
    # First arg is the haystack (a list); second is the needle.
    "any": Builtin("any", (TList(TAny()), TAny()), TBool()),
    "to_int": Builtin("to_int", (TString(),), TInt()),
    "to_float": Builtin("to_float", (TString(),), TFloat()),
    "now_unix": Builtin("now_unix", (), TFloat()),
    "is_null": Builtin("is_null", (TAny(),), TBool()),
}


# ---------------------------------------------------------------------------
# Action signatures
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class ActionSig:
    name: str
    # Required positional arg types (usually empty -- most actions take only kwargs)
    positional: tuple[Type, ...]
    # Allowed keyword names with their types.
    kwargs: dict[str, Type]


ACTIONS: dict[str, ActionSig] = {
    "allow": ActionSig("allow", (), {}),
    "block": ActionSig(
        "block",
        (),
        {"status": TInt(), "reason": TString()},
    ),
    "tag": ActionSig(
        "tag",
        (),
        {"name": TString(), "severity": TString()},
    ),
    "limit": ActionSig(
        "limit",
        (),
        {"key": TString(), "rate": TString(), "burst": TInt()},
    ),
    "challenge": ActionSig(
        "challenge",
        (),
        {"reason": TString()},
    ),
}


__all__ = [
    "PATH_ROOTS",
    "BUILTINS",
    "ACTIONS",
    "PathRoot",
    "Builtin",
    "ActionSig",
]
