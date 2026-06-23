"""
Structured logging helpers for FlowQ.

Provides:
  - JSONFormatter: emits one JSON object per log line
  - configure_logging(): one-call setup for console + optional file handler
  - get_logger(): thin wrapper around logging.getLogger with FlowQ namespace

Example::

    from flowq.logging_config import configure_logging
    configure_logging(level="DEBUG", json=True, log_file="flowq.log")
"""

from __future__ import annotations

import json
import logging
import logging.handlers
import os
import sys
import time
from typing import Optional


class JSONFormatter(logging.Formatter):
    """Render each LogRecord as a single-line JSON object."""

    RESERVED = {
        "args", "created", "exc_info", "exc_text", "filename",
        "funcName", "levelname", "levelno", "lineno", "message",
        "module", "msecs", "msg", "name", "pathname", "process",
        "processName", "relativeCreated", "stack_info", "thread",
        "threadName",
    }

    def format(self, record: logging.LogRecord) -> str:
        record.message = record.getMessage()
        obj: dict = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.message,
        }
        if record.exc_info:
            obj["exc"] = self.formatException(record.exc_info)
        # Forward any extra fields passed via extra={}
        for key, val in record.__dict__.items():
            if key not in self.RESERVED and not key.startswith("_"):
                try:
                    json.dumps(val)
                    obj[key] = val
                except (TypeError, ValueError):
                    obj[key] = str(val)
        try:
            return json.dumps(obj, default=str)
        except Exception:
            return json.dumps({"msg": str(obj)})


class ConsoleFormatter(logging.Formatter):
    """Coloured human-readable formatter for development consoles."""

    COLOURS = {
        logging.DEBUG:    "[36m",   # cyan
        logging.INFO:     "[32m",   # green
        logging.WARNING:  "[33m",   # yellow
        logging.ERROR:    "[31m",   # red
        logging.CRITICAL: "[35m",   # magenta
    }
    RESET = "[0m"

    def format(self, record: logging.LogRecord) -> str:
        colour = self.COLOURS.get(record.levelno, "")
        base = super().format(record)
        if sys.stderr.isatty():
            return f"{colour}{base}{self.RESET}"
        return base


def configure_logging(
    level: str = "WARNING",
    json: bool = False,
    log_file: Optional[str] = None,
    max_bytes: int = 10 * 1024 * 1024,
    backup_count: int = 3,
    logger_name: str = "flowq",
) -> logging.Logger:
    """
    Configure the FlowQ root logger.

    Parameters
    ----------
    level:
        Log level string (DEBUG/INFO/WARNING/ERROR/CRITICAL).
    json:
        Use JSONFormatter instead of human-readable output.
    log_file:
        Optional path for a rotating file handler.
    max_bytes:
        Rotate log file when it reaches this size.
    backup_count:
        Number of rotated log files to keep.
    logger_name:
        Logger namespace (default ``"flowq"``).
    """
    numeric = getattr(logging, level.upper(), logging.WARNING)
    root = logging.getLogger(logger_name)
    root.setLevel(numeric)
    root.handlers.clear()

    # console handler
    ch = logging.StreamHandler(sys.stderr)
    ch.setLevel(numeric)
    if json:
        ch.setFormatter(JSONFormatter())
    else:
        ch.setFormatter(ConsoleFormatter(
            fmt="%(asctime)s %(levelname)-8s %(name)s  %(message)s",
            datefmt="%H:%M:%S",
        ))
    root.addHandler(ch)

    # optional rotating file handler
    if log_file:
        fh = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding="utf-8",
        )
        fh.setLevel(numeric)
        fh.setFormatter(JSONFormatter())   # always JSON in files
        root.addHandler(fh)

    return root


def get_logger(name: str) -> logging.Logger:
    """Return a child logger under the ``flowq`` namespace."""
    return logging.getLogger(f"flowq.{name}")
