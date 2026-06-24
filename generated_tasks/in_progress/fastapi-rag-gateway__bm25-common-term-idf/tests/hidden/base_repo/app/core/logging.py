"""Structured logging configuration.

The application supports two output formats:

* ``console`` — human-friendly, colourised when a TTY is available.
* ``json`` — single-line JSON, suitable for log aggregation.

Logging is configured exactly once via :func:`configure_logging`. The
function is idempotent so it can safely be called from the FastAPI
startup hook *and* the Celery worker bootstrap.
"""

from __future__ import annotations

import json
import logging
import logging.config
import os
import sys
import time
import uuid
from collections.abc import Mapping, MutableMapping
from contextvars import ContextVar
from typing import Any

from app.core.config import Settings, get_settings

_REQUEST_ID: ContextVar[str | None] = ContextVar("request_id", default=None)
_CORRELATION_ID: ContextVar[str | None] = ContextVar("correlation_id", default=None)
_USER_ID: ContextVar[str | None] = ContextVar("user_id", default=None)

_CONFIGURED = False


def configure_logging(settings: Settings | None = None) -> None:
    """Apply logging configuration based on the active settings."""

    global _CONFIGURED
    settings = settings or get_settings()

    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setLevel(level)

    if settings.log_format == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(ConsoleFormatter())

    handler.addFilter(ContextFilter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # Tame the noisy third-party loggers.
    for name, lvl in _NOISY_LOGGERS.items():
        logging.getLogger(name).setLevel(lvl)

    _CONFIGURED = True


def get_logger(name: str | None = None) -> logging.Logger:
    """Return a logger, configuring logging on first use."""

    if not _CONFIGURED:
        configure_logging()
    return logging.getLogger(name or "app")


# ---------------------------------------------------------------------------
# Context helpers
# ---------------------------------------------------------------------------


def set_request_id(request_id: str | None) -> None:
    _REQUEST_ID.set(request_id)


def get_request_id() -> str | None:
    return _REQUEST_ID.get()


def set_correlation_id(correlation_id: str | None) -> None:
    _CORRELATION_ID.set(correlation_id)


def get_correlation_id() -> str | None:
    return _CORRELATION_ID.get()


def set_user_id(user_id: str | None) -> None:
    _USER_ID.set(user_id)


def get_user_id() -> str | None:
    return _USER_ID.get()


def new_request_id() -> str:
    return uuid.uuid4().hex


# ---------------------------------------------------------------------------
# Filters / formatters
# ---------------------------------------------------------------------------


class ContextFilter(logging.Filter):
    """Inject contextual identifiers into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:  # pragma: no cover - simple
        record.request_id = _REQUEST_ID.get()
        record.correlation_id = _CORRELATION_ID.get()
        record.user_id = _USER_ID.get()
        record.service = os.environ.get("SERVICE_NAME", "rag-gateway")
        record.environment = os.environ.get("ENVIRONMENT", "development")
        return True


class JsonFormatter(logging.Formatter):
    """Render log records as compact JSON."""

    def format(self, record: logging.LogRecord) -> str:  # pragma: no cover - I/O
        payload: dict[str, Any] = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "service": getattr(record, "service", None),
            "environment": getattr(record, "environment", None),
            "request_id": getattr(record, "request_id", None),
            "correlation_id": getattr(record, "correlation_id", None),
            "user_id": getattr(record, "user_id", None),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        if record.stack_info:
            payload["stack"] = self.formatStack(record.stack_info)
        if isinstance(record.args, Mapping):
            for k, v in record.args.items():
                payload.setdefault(str(k), v)
        for key, value in getattr(record, "extra", {}).items():
            payload.setdefault(key, value)
        return json.dumps(_safe(payload), default=_default_serialiser)


class ConsoleFormatter(logging.Formatter):
    """Human-friendly console formatter with optional ANSI colours."""

    _COLOURS = {
        "DEBUG": "\033[37m",
        "INFO": "\033[36m",
        "WARNING": "\033[33m",
        "ERROR": "\033[31m",
        "CRITICAL": "\033[1;31m",
    }
    _RESET = "\033[0m"

    def __init__(self) -> None:
        super().__init__(
            fmt=("%(asctime)s %(levelname)-8s %(name)s " "[%(request_id)s] - %(message)s"),
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    def format(self, record: logging.LogRecord) -> str:  # pragma: no cover - I/O
        if not getattr(record, "request_id", None):
            record.request_id = "-"
        rendered = super().format(record)
        if sys.stdout.isatty():
            colour = self._COLOURS.get(record.levelname, "")
            if colour:
                rendered = f"{colour}{rendered}{self._RESET}"
        return rendered


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


_NOISY_LOGGERS: dict[str, int] = {
    "uvicorn": logging.INFO,
    "uvicorn.access": logging.WARNING,
    "uvicorn.error": logging.INFO,
    "asyncio": logging.WARNING,
    "httpx": logging.WARNING,
    "httpcore": logging.WARNING,
    "urllib3": logging.WARNING,
    "openai": logging.WARNING,
    "langchain": logging.WARNING,
    "langchain_core": logging.WARNING,
    "langchain_community": logging.WARNING,
    "chromadb": logging.WARNING,
    "sqlalchemy.engine": logging.WARNING,
}


def _safe(payload: MutableMapping[str, Any]) -> MutableMapping[str, Any]:
    return {k: v for k, v in payload.items() if v is not None}


def _default_serialiser(value: Any) -> Any:
    try:
        return str(value)
    except Exception:  # pragma: no cover - defensive
        return repr(value)


__all__ = [
    "configure_logging",
    "get_logger",
    "set_request_id",
    "get_request_id",
    "set_correlation_id",
    "get_correlation_id",
    "set_user_id",
    "get_user_id",
    "new_request_id",
    "ContextFilter",
    "JsonFormatter",
    "ConsoleFormatter",
]
