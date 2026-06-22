"""QueryWeave — a lightweight data query engine."""
from __future__ import annotations

__version__ = "0.4.1"
__all__ = [
    "parse",
    "execute",
    "Table",
    "Row",
    "QueryError",
]

from queryweave.parser.parser import parse
from queryweave.storage.table import Table
from queryweave.storage.row import Row


class QueryError(Exception):
    """Base exception for all query engine errors."""


def execute(query: str, catalog: dict[str, Table] | None = None) -> list[Row]:
    """Parse and execute a query against the given catalog."""
    from queryweave.parser.parser import Parser
    from queryweave.parser.lexer import Lexer

    tree = Parser(Lexer(query)).parse_statement()
    # execution left to higher-level engine layer
    raise NotImplementedError("Full execution pipeline not yet wired")
