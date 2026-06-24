"""Optional Sentry integration."""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


def init(settings: Settings | None = None) -> bool:
    """Initialise Sentry if a DSN is configured.

    Returns ``True`` when initialisation succeeded so callers can enable
    additional middleware or skip the integration entirely in tests.
    """

    settings = settings or get_settings()
    dsn = settings.secret("sentry_dsn")
    if not dsn:
        return False
    try:  # pragma: no cover - optional dep
        import sentry_sdk
        from sentry_sdk.integrations.asgi import SentryAsgiMiddleware  # noqa: F401
        from sentry_sdk.integrations.logging import LoggingIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=settings.sentry_environment or settings.environment,
            traces_sample_rate=settings.sentry_traces_sample_rate,
            integrations=[
                LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
            ],
            release=settings.app_version,
        )
        logger.info("sentry.initialised", extra={"environment": settings.sentry_environment})
        return True
    except Exception as exc:  # pragma: no cover - optional dep
        logger.warning("sentry.unavailable", extra={"error": str(exc)})
        return False


def capture_exception(exc: Exception, **context: Any) -> None:
    """Forward an exception to Sentry if initialised."""

    try:  # pragma: no cover - optional dep
        import sentry_sdk

        with sentry_sdk.push_scope() as scope:
            for key, value in context.items():
                scope.set_extra(key, value)
            sentry_sdk.capture_exception(exc)
    except Exception:
        logger.exception("sentry.capture_failed")


__all__ = ["capture_exception", "init"]
