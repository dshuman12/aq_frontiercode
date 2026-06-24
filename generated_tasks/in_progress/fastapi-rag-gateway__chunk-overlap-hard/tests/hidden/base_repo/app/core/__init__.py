"""Core utilities and cross-cutting concerns.

Modules in this package are intentionally framework-light: they should
be importable from anywhere in the application without pulling in
heavyweight optional dependencies (LangChain, vector stores, Celery,
…). This keeps the import graph tidy and lets us unit-test the rest of
the application in isolation.
"""

from __future__ import annotations

from app.core.config import Settings, get_settings
from app.core.constants import (
    APP_NAME,
    DEFAULT_API_PREFIX,
    DEFAULT_TIMEZONE,
    SUPPORTED_LANGUAGES,
)
from app.core.exceptions import (
    AppError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)
from app.core.logging import configure_logging, get_logger

__all__ = [
    "Settings",
    "get_settings",
    "APP_NAME",
    "DEFAULT_API_PREFIX",
    "DEFAULT_TIMEZONE",
    "SUPPORTED_LANGUAGES",
    "AppError",
    "AuthenticationError",
    "AuthorizationError",
    "ConflictError",
    "NotFoundError",
    "RateLimitError",
    "ValidationError",
    "configure_logging",
    "get_logger",
]
