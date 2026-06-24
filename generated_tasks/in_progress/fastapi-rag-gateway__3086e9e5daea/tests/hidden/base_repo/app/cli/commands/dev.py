"""Dev-mode CLI commands."""

from __future__ import annotations

try:  # pragma: no cover - optional dep
    import typer
except Exception:  # pragma: no cover - optional dep
    typer = None  # type: ignore[assignment]

from app.core.config import get_settings

app = typer.Typer(help="Developer helpers.") if typer else None


if app is not None:

    @app.command()
    def info() -> None:
        """Print the resolved settings (non-secret values only)."""

        settings = get_settings()
        masked = settings.model_dump_safe()
        for key, value in sorted(masked.items()):
            typer.echo(f"{key}={value}")

    @app.command()
    def routes() -> None:
        """Print all registered HTTP routes."""

        from app.factory import create_app

        app_ = create_app()
        for route in app_.router.routes:
            methods = ",".join(getattr(route, "methods", ()) or [])
            path = getattr(route, "path", "")
            typer.echo(f"{methods or 'WS':10s} {path}")

    @app.command()
    def shell() -> None:
        """Drop into an interactive Python REPL with the app preloaded."""

        import code

        from app.core.config import get_settings as _settings

        banner = "RAG Gateway shell — `settings`, `Settings` available."
        local: dict[str, object] = {
            "settings": _settings(),
            "Settings": type(_settings()),
        }
        code.interact(banner=banner, local=local)


__all__ = ["app"]
