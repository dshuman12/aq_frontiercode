"""Error hierarchy for bulwark.

Three families:

* ``BulwarkError`` -- base for everything we raise on purpose.
* ``RuleError`` -- anything wrong with a rule source file (lex, parse,
  typecheck, compile).
* ``RuntimeError`` -- anything that goes wrong while serving a request
  that isn't already an HTTP response (e.g. upstream pool exhausted).

Diagnostics carry a span when they have one. The ``render`` helper
turns them into the multi-line "carat under the offending token" output
the CLI prints.
"""

from __future__ import annotations

from dataclasses import dataclass

from bulwark.span import Span, line_col


class BulwarkError(Exception):
    """Base class for bulwark's own exceptions."""


class RuleError(BulwarkError):
    """A rule source file is bad. Carries an optional span."""

    def __init__(self, message: str, span: Span | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.span = span


class LexError(RuleError):
    pass


class ParseError(RuleError):
    pass


class TypeError_(RuleError):
    """Type checker failure. Named with a trailing underscore to avoid
    shadowing the builtin in modules that ``from bulwark.errors import *``."""


class CompileError(RuleError):
    pass


class BulwarkRuntimeError(BulwarkError):
    """Runtime errors that aren't part of a normal request rejection."""


@dataclass
class Diagnostic:
    message: str
    span: Span | None
    severity: str = "error"  # "error" | "warning" | "note"

    def render(self, source: str, *, filename: str = "<rules>") -> str:
        if self.span is None:
            return f"{self.severity}: {self.message}"
        line, col = line_col(source, self.span.start)
        line_text = _line_at(source, self.span.start)
        caret_pad = " " * (col - 1)
        caret = "^" * max(1, len(self.span))
        return (
            f"{filename}:{line}:{col}: {self.severity}: {self.message}\n"
            f"  {line_text}\n"
            f"  {caret_pad}{caret}"
        )


def _line_at(source: str, offset: int) -> str:
    start = source.rfind("\n", 0, offset) + 1
    end = source.find("\n", offset)
    if end == -1:
        end = len(source)
    return source[start:end]
