"""Database-migration commands."""

from __future__ import annotations

import asyncio

try:  # pragma: no cover - optional dep
    import typer
except Exception:  # pragma: no cover - optional dep
    typer = None  # type: ignore[assignment]

app = typer.Typer(help="Database migrations and schema management.") if typer else None


if app is not None:

    @app.command()
    def upgrade(target: str = typer.Argument("head")) -> None:
        """Run Alembic migrations to ``target`` (defaults to head)."""

        from app.db.init_db import upgrade_to

        asyncio.run(upgrade_to(target))
        typer.echo(f"Database upgraded to {target}.")

    @app.command()
    def downgrade(target: str = typer.Argument("base")) -> None:
        """Roll back migrations to ``target``."""

        from app.db.init_db import downgrade_to

        asyncio.run(downgrade_to(target))
        typer.echo(f"Database downgraded to {target}.")

    @app.command("create-all")
    def create_all() -> None:
        """Create all tables defined on the metadata directly."""

        from app.db.init_db import create_all as _create

        asyncio.run(_create())
        typer.echo("All tables created.")

    @app.command("drop-all")
    def drop_all(confirm: bool = typer.Option(False, "--yes-i-am-sure")) -> None:
        """DESTRUCTIVE: drop every table managed by the application."""

        if not confirm:
            typer.echo("Refusing to drop tables without --yes-i-am-sure")
            raise typer.Exit(code=1)
        from app.db.init_db import drop_all as _drop

        asyncio.run(_drop())
        typer.echo("All tables dropped.")


__all__ = ["app"]
