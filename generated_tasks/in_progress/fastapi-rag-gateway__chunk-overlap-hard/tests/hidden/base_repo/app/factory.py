"""FastAPI application factory.

The factory wires together middleware, exception handlers, lifespan
events and routers. It is intentionally idempotent so it can be called
in tests, in worker entrypoints or from the legacy :mod:`main` shim.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from app.core.config import Settings, get_settings
from app.core.events import lifecycle
from app.core.logging import configure_logging, get_logger
from app.core.middleware import (
    AccessLogMiddleware,
    MaxRequestSizeMiddleware,
    RateLimitMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
    install_exception_handlers,
)
from app.observability import metrics as metrics_module  # noqa: F401  (warm cache)
from app.observability import sentry as sentry_module
from app.observability import tracing as tracing_module

logger = get_logger(__name__)


def create_app(settings: Settings | None = None):  # pragma: no cover - I/O heavy
    """Build a fully configured FastAPI application."""

    from fastapi import FastAPI

    settings = settings or get_settings()
    configure_logging(settings)
    sentry_module.init(settings)
    tracing_module.init(settings)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url=settings.docs_url,
        redoc_url=settings.redoc_url,
        openapi_url=settings.openapi_url,
        root_path=settings.root_path,
        lifespan=_lifespan,
    )

    _install_middleware(app, settings)
    install_exception_handlers(app)
    _register_routes(app, settings)

    @app.get("/", include_in_schema=False)
    async def root():
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
            "docs_url": settings.docs_url,
        }

    return app


def _install_middleware(app, settings: Settings) -> None:  # pragma: no cover - I/O
    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(AccessLogMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    if settings.rate_limit_enabled:
        app.add_middleware(RateLimitMiddleware, settings=settings)
    app.add_middleware(
        MaxRequestSizeMiddleware,
        max_bytes=settings.max_upload_bytes,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins or ["*"],
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=settings.cors_allow_methods or ["*"],
        allow_headers=settings.cors_allow_headers or ["*"],
    )


def _register_routes(app, settings: Settings) -> None:  # pragma: no cover - I/O
    from app.api import api_router

    app.include_router(api_router, prefix=settings.api_prefix.rstrip("/"))


@asynccontextmanager
async def _lifespan(app) -> AsyncIterator[None]:  # pragma: no cover - I/O
    settings = get_settings()
    logger.info("app.startup", extra={"phase": "starting"})
    await lifecycle.run_startup(settings)
    try:
        yield
    finally:
        await lifecycle.run_shutdown(settings)
        logger.info("app.shutdown", extra={"phase": "stopped"})


__all__ = ["create_app"]
