"""Ingestion-related CLI commands."""

from __future__ import annotations

import asyncio
from pathlib import Path

try:  # pragma: no cover - optional dep
    import typer
except Exception:  # pragma: no cover - optional dep
    typer = None  # type: ignore[assignment]

from app.core.config import get_settings

app = typer.Typer(help="Ingest documents into the gateway.") if typer else None


if app is not None:

    @app.command("file")
    def ingest_file(
        path: Path = typer.Argument(..., exists=True, readable=True),
        title: str | None = typer.Option(None),
        owner: str | None = typer.Option(None),
        tag: list[str] = typer.Option(None),
    ) -> None:
        """Index a file from disk."""

        from app.db.session import get_session
        from app.services.ingestion import IngestionService

        async def _run() -> None:
            settings = get_settings()
            async for session in get_session():
                service = IngestionService(session, settings=settings)
                result = await service.ingest_path(
                    path,
                    owner_id=owner,
                    title=title,
                    tags=tag or [],
                )
                await session.commit()
                typer.echo(
                    f"Indexed {result.chunks_indexed} chunks from {path} (id={result.document.id})"
                )

        asyncio.run(_run())

    @app.command("text")
    def ingest_text(
        body: str = typer.Argument(...),
        title: str = typer.Option("inline"),
        owner: str | None = typer.Option(None),
    ) -> None:
        """Index a literal block of text."""

        from app.db.session import get_session
        from app.services.ingestion import IngestionService

        async def _run() -> None:
            async for session in get_session():
                service = IngestionService(session)
                result = await service.ingest_text(body, owner_id=owner, title=title)
                await session.commit()
                typer.echo(f"Indexed inline text (id={result.document.id})")

        asyncio.run(_run())

    @app.command("url")
    def ingest_url(
        url: str = typer.Argument(...),
        owner: str | None = typer.Option(None),
        title: str | None = typer.Option(None),
    ) -> None:
        """Index a remote URL."""

        from app.db.session import get_session
        from app.services.ingestion import IngestionService

        async def _run() -> None:
            async for session in get_session():
                service = IngestionService(session)
                result = await service.ingest_url(url, owner_id=owner, title=title)
                await session.commit()
                typer.echo(f"Indexed {url} (id={result.document.id})")

        asyncio.run(_run())


__all__ = ["app"]
