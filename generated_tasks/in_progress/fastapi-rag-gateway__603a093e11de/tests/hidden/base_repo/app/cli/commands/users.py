"""User-management CLI commands."""

from __future__ import annotations

import asyncio

try:  # pragma: no cover - optional dep
    import typer
except Exception:  # pragma: no cover - optional dep
    typer = None  # type: ignore[assignment]

app = typer.Typer(help="Manage gateway users.") if typer else None


if app is not None:

    @app.command()
    def create(email: str, password: str, full_name: str = "") -> None:
        from app.db.session import get_session
        from app.schemas.user import UserCreate
        from app.services.users import UserService

        async def _run() -> None:
            async for session in get_session():
                service = UserService(session)
                user = await service.create(
                    UserCreate(email=email, password=password, full_name=full_name or None)
                )
                await session.commit()
                typer.echo(f"Created user {user.email} (id={user.id})")

        asyncio.run(_run())

    @app.command("create-admin")
    def create_admin(email: str, password: str) -> None:
        from app.db.session import get_session
        from app.services.users import UserService

        async def _run() -> None:
            async for session in get_session():
                service = UserService(session)
                user = await service.ensure_default_admin(email=email, password=password)
                await session.commit()
                typer.echo(f"Admin user ensured: {user.email}")

        asyncio.run(_run())

    @app.command("set-password")
    def set_password(user_id: str, password: str) -> None:
        from app.db.session import get_session
        from app.services.users import UserService

        async def _run() -> None:
            async for session in get_session():
                service = UserService(session)
                user = await service.set_password(user_id, password)
                await session.commit()
                typer.echo(f"Password updated for {user.email}")

        asyncio.run(_run())

    @app.command()
    def list() -> None:  # noqa: A001 — Typer command name shadowing OK
        from app.core.pagination import PageRequest
        from app.db.session import get_session
        from app.services.users import UserService

        async def _run() -> None:
            async for session in get_session():
                service = UserService(session)
                page = await service.list(PageRequest(page=1, size=100))
                for user in page.items:
                    typer.echo(
                        f"{user.id} {user.email:40s} active={user.is_active} admin={user.is_admin}"
                    )

        asyncio.run(_run())


__all__ = ["app"]
