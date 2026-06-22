# queryweave

QueryWeave is an early-stage, dependency-light Python package for parsing and
eventually running SQL-like queries over local data. This task snapshot contains
the lexer, token stream, and AST node dataclasses, but the parser
implementation is intentionally missing.

## Development

Install the package in editable mode with its test dependencies when available:

```bash
pip install -e ".[dev]"
```

Parser work should stay under `src/queryweave/parser/` and tests should live
under `tests/`. The expected parser test command for this task is:

```bash
pytest tests/test_parser.py
```

The storage, execution, catalog, and CLI layers are outside this snapshot and
should not be added as part of parser-focused changes.
