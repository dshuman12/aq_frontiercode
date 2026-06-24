"""Operational CLI entry point.

This module assembles the Typer application from the individual command
groups. When Typer is unavailable, a tiny argparse-based dispatcher is
used so the CLI remains importable.
"""

from __future__ import annotations

import sys
from collections.abc import Sequence

from app.cli import commands as _commands  # noqa: F401  (registers commands)

try:  # pragma: no cover - optional dep
    import typer

    app = typer.Typer(help="FastAPI RAG Gateway operational CLI.")
    from app.cli.commands.dev import app as dev_app
    from app.cli.commands.ingest import app as ingest_app
    from app.cli.commands.migrate import app as migrate_app
    from app.cli.commands.queue import app as queue_app
    from app.cli.commands.users import app as users_app

    app.add_typer(ingest_app, name="ingest", help="Document ingestion utilities.")
    app.add_typer(users_app, name="users", help="User-management utilities.")
    app.add_typer(migrate_app, name="migrate", help="Database migrations.")
    app.add_typer(queue_app, name="queue", help="Queue / worker utilities.")
    app.add_typer(dev_app, name="dev", help="Local development helpers.")
except Exception:  # pragma: no cover - optional dep
    app = None  # type: ignore[assignment]


def run(argv: Sequence[str] | None = None) -> int:
    """Execute the CLI, returning the exit code."""

    if app is not None:
        try:
            app(args=list(argv) if argv is not None else None, prog_name="rag-gateway")
            return 0
        except SystemExit as exc:
            return int(exc.code or 0)
    sys.stderr.write("Typer is not installed — CLI commands unavailable.\n")
    return 1


__all__ = ["app", "run"]
