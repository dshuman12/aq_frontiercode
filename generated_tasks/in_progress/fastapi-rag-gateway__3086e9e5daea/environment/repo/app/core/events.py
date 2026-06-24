"""Application lifecycle hooks.

The startup / shutdown machinery is split out from :mod:`app.main` so
that it can be unit tested in isolation. Hooks are registered as plain
async callables and dispatched in deterministic order.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass, field

from app.core.config import Settings, get_settings
from app.core.logging import configure_logging, get_logger

Hook = Callable[[Settings], Awaitable[None]]
_logger = get_logger("app.lifecycle")


@dataclass
class LifecycleManager:
    """Collect and dispatch startup / shutdown hooks."""

    startup_hooks: list[Hook] = field(default_factory=list)
    shutdown_hooks: list[Hook] = field(default_factory=list)
    timeout_seconds: float = 30.0

    def on_startup(self, hook: Hook) -> Hook:
        self.startup_hooks.append(hook)
        return hook

    def on_shutdown(self, hook: Hook) -> Hook:
        self.shutdown_hooks.append(hook)
        return hook

    async def run_startup(self, settings: Settings) -> None:
        for hook in self.startup_hooks:
            _logger.debug("startup.run", extra={"hook": hook.__qualname__})
            await asyncio.wait_for(hook(settings), timeout=self.timeout_seconds)

    async def run_shutdown(self, settings: Settings) -> None:
        for hook in reversed(self.shutdown_hooks):
            _logger.debug("shutdown.run", extra={"hook": hook.__qualname__})
            try:
                await asyncio.wait_for(hook(settings), timeout=self.timeout_seconds)
            except Exception:  # pragma: no cover - defensive
                _logger.exception("shutdown.error", extra={"hook": hook.__qualname__})


lifecycle = LifecycleManager()


@lifecycle.on_startup
async def _configure_logging_hook(settings: Settings) -> None:
    configure_logging(settings)
    _logger.info(
        "app.starting",
        extra={
            "version": settings.app_version,
            "environment": settings.environment,
            "llm_provider": settings.llm_provider,
            "embedding_provider": settings.embedding_provider,
            "vector_store": settings.vector_store,
        },
    )


@lifecycle.on_startup
async def _print_banner_hook(settings: Settings) -> None:
    if not settings.debug:
        return
    banner = "\n".join(
        [
            "================================================================",
            f"  {settings.app_name} v{settings.app_version}",
            f"  Environment : {settings.environment}",
            f"  API prefix  : {settings.api_prefix}",
            f"  Database    : {settings.database_url.split('://', 1)[0]}",
            f"  LLM         : {settings.llm_provider}/{settings.llm_model}",
            f"  Embeddings  : {settings.embedding_provider}/{settings.embedding_model}",
            f"  Vector store: {settings.vector_store}",
            "================================================================",
        ]
    )
    _logger.info("app.banner", extra={"banner": banner})


@lifecycle.on_shutdown
async def _farewell_hook(settings: Settings) -> None:
    _logger.info("app.shutdown", extra={"environment": settings.environment})


@asynccontextmanager
async def lifespan_context(settings: Settings | None = None) -> AsyncIterator[None]:
    """Async context manager wrapping startup and shutdown."""

    settings = settings or get_settings()
    await lifecycle.run_startup(settings)
    try:
        yield
    finally:
        await lifecycle.run_shutdown(settings)


__all__ = [
    "Hook",
    "LifecycleManager",
    "lifecycle",
    "lifespan_context",
]
