"""Token kinds for the rule DSL.

The token stream is small on purpose. Anything that looks like an
identifier is a single ``IDENT`` token; the parser decides whether it's
a keyword based on context. The lexer only special-cases punctuation
and literals.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, auto

from bulwark.span import Span


class Tok(Enum):
    # Literals
    INT = auto()
    FLOAT = auto()
    STRING = auto()
    REGEX = auto()
    IDENT = auto()

    # Punctuation
    LPAREN = auto()
    RPAREN = auto()
    LBRACE = auto()
    RBRACE = auto()
    LBRACK = auto()
    RBRACK = auto()
    COMMA = auto()
    DOT = auto()
    COLON = auto()
    SEMI = auto()
    EQ = auto()  # =

    # Operators
    EQEQ = auto()  # ==
    NEQ = auto()   # !=
    LT = auto()
    LE = auto()
    GT = auto()
    GE = auto()
    MATCHES = auto()  # =~ in source, but we keep the name verbose
    IN = auto()       # set/CIDR membership

    # Misc
    EOF = auto()
    NEWLINE = auto()  # significant only between top-level rule blocks


# A handful of words are reserved at the keyword level -- they always
# tokenize as IDENT but the parser treats them specially.
KEYWORDS = frozenset(
    {
        "phase",
        "rule",
        "when",
        "then",
        "and",
        "or",
        "not",
        "true",
        "false",
        "null",
        "in",
        "matches",
    }
)


@dataclass(frozen=True, slots=True)
class Token:
    kind: Tok
    span: Span
    # ``value`` is the lexeme for IDENT/STRING/REGEX, the parsed number
    # for INT/FLOAT, and an empty string for punctuation.
    value: str | int | float = ""
