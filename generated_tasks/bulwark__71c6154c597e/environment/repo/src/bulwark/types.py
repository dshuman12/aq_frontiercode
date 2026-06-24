"""The bulwark rule-DSL type system.

The lattice is small:

    bool    int    float    string    regex    null
       \\     |       |        |        |       /
        \\    |       |        |        |      /
         ─────────────  scalar  ────────────────
                         |
                         |     list<T>
                         |        |
                         ──── value ────
                                 |
                                any

Subtyping relations:

    bool <: int <: float <: scalar
    string <: scalar
    regex  <: scalar    (regex is its own type, not a string subtype)
    null   <: scalar
    list<T> <: list<U>  iff  T <: U
    every type <: any

The type checker uses ``any`` as the type of values whose shape we
can't statically know -- typically the result of dotted path access into
``body.*`` (since the shape of an incoming JSON body is, by definition,
not known at rule load time).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Union


@dataclass(frozen=True, slots=True)
class TBool:
    pass


@dataclass(frozen=True, slots=True)
class TInt:
    pass


@dataclass(frozen=True, slots=True)
class TFloat:
    pass


@dataclass(frozen=True, slots=True)
class TString:
    pass


@dataclass(frozen=True, slots=True)
class TRegex:
    pass


@dataclass(frozen=True, slots=True)
class TNull:
    pass


@dataclass(frozen=True, slots=True)
class TList:
    elem: "Type"


@dataclass(frozen=True, slots=True)
class TAny:
    pass


@dataclass(frozen=True, slots=True)
class TNever:
    pass


Type = Union[TBool, TInt, TFloat, TString, TRegex, TNull, TList, TAny, TNever]


def is_subtype(a: Type, b: Type) -> bool:
    """Return True if ``a`` is a subtype of ``b``."""
    if isinstance(b, TAny) or isinstance(a, TNever):
        return True
    if isinstance(a, TAny):
        # any is permissive in both directions for ergonomics in a config
        # language. The engine guards types at runtime.
        return True
    if type(a) is type(b):
        if isinstance(a, TList) and isinstance(b, TList):
            return is_subtype(a.elem, b.elem)
        return True
    # Numeric ladder: bool <: int <: float
    if isinstance(a, TBool) and isinstance(b, (TInt, TFloat)):
        return True
    if isinstance(a, TInt) and isinstance(b, TFloat):
        return True
    return False


def join(a: Type, b: Type) -> Type:
    """The least upper bound of ``a`` and ``b`` in the type lattice."""
    if is_subtype(a, b):
        return b
    if is_subtype(b, a):
        return a
    # Lists join only when their element types join cleanly.
    if isinstance(a, TList) and isinstance(b, TList):
        return TList(join(a.elem, b.elem))
    return TAny()


def fmt(t: Type) -> str:
    if isinstance(t, TBool):
        return "bool"
    if isinstance(t, TInt):
        return "int"
    if isinstance(t, TFloat):
        return "float"
    if isinstance(t, TString):
        return "string"
    if isinstance(t, TRegex):
        return "regex"
    if isinstance(t, TNull):
        return "null"
    if isinstance(t, TAny):
        return "any"
    if isinstance(t, TNever):
        return "never"
    if isinstance(t, TList):
        return f"list<{fmt(t.elem)}>"
    raise AssertionError(f"unknown type: {t!r}")
