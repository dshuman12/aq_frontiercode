"""Queue / worker CLI commands."""

from __future__ import annotations

try:  # pragma: no cover - optional dep
    import typer
except Exception:  # pragma: no cover - optional dep
    typer = None  # type: ignore[assignment]

from app.workers.executor import enqueue
from app.workers.scheduler import default_schedule

app = typer.Typer(help="Inspect and dispatch queue tasks.") if typer else None


if app is not None:

    @app.command()
    def schedule() -> None:
        """Print the configured periodic schedule."""

        for entry in default_schedule():
            typer.echo(
                f"{entry.name:30s} every {entry.every} → {entry.task} (enabled={entry.enabled})"
            )

    @app.command()
    def dispatch(name: str, *args: str) -> None:
        """Send a task to the queue."""

        task_id = enqueue(name, *args)
        typer.echo(f"Dispatched {name} → {task_id}")


__all__ = ["app"]
