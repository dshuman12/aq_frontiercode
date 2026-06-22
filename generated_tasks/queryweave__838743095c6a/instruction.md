# Task description

QueryWeave already has lexer tokens and AST node classes for a SQL-like query language, but the parser layer is missing from the starting snapshot. Add the first mergeable parser slice in `src/queryweave/parser/parser.py`: a recursive descent parser for core `SELECT` statements plus a small `parse(query: str)` convenience function from that module. The parser should consume the existing `Lexer` and `TokenStream` APIs, build the dataclasses in `src/queryweave/parser/ast_nodes.py`, and support select lists, aliases, schema-qualified tables, joins with `ON` clauses, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`/`OFFSET`, aggregate and ordinary function calls, literals, column references, `IN`, `BETWEEN`, `LIKE`, `IS [NOT] NULL`, and expression precedence for OR, AND, NOT, comparisons, addition/concatenation, multiplication, unary operators, and primary expressions. Keep this focused on parsing only; do not build storage, optimization, execution, catalog behavior, DML, DDL, unions, windows, or full SQL coverage as part of this task.

# Test guidelines

Run `pytest tests/test_parser.py` and ensure it passes. Add parser-focused tests under `tests/test_parser.py` that exercise the public behavior you are adding: simple and aliased SELECT lists, WHERE expressions, joins, GROUP BY, HAVING, ORDER BY, LIMIT/OFFSET, aggregate calls, predicate expressions, operator precedence, and malformed or out-of-scope input. The repository snapshot is early and does not include the later storage or execution packages, so tests should target parser, lexer, and AST modules directly rather than relying on top-level `queryweave` exports from later versions.

# Lint guidelines

Use the existing Python style from `lexer.py` and `ast_nodes.py`: type annotations, small parser methods, clear error messages, and no external runtime dependencies. If available in your environment, `python -m compileall src tests` is a useful quick syntax check after the pytest run. Do not introduce formatter or linter configuration that is not already part of this repository.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch. Keep the implementation localized to the parser module and parser tests unless a tiny import compatibility adjustment is necessary for those parser APIs to be usable.
