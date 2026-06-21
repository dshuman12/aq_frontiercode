"""
nexusflow.telemetry.logging
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Structured logging with correlation IDs, log levels, and
configurable output formatting. Supports JSON and text output.
"""

from __future__ import annotations

import json
import threading
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any, Callable, Dict, Deque, List, Optional, TextIO


class LogLevel(IntEnum):
    """Log severity levels."""
    TRACE = 5
    DEBUG = 10
    INFO = 20
    WARNING = 30
    ERROR = 40
    CRITICAL = 50


@dataclass
class LogRecord:
    """A single log entry."""
    level: LogLevel
    message: str
    timestamp: float = field(default_factory=time.time)
    logger_name: str = ""
    correlation_id: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        record = {
            "timestamp": self.timestamp,
            "level": self.level.name,
            "message": self.message,
            "logger": self.logger_name,
        }
        if self.correlation_id:
            record["correlation_id"] = self.correlation_id
        if self.context:
            record["context"] = self.context
        if self.extra:
            record.update(self.extra)
        return record

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), default=str)

    def to_text(self) -> str:
        ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(self.timestamp))
        parts = [f"[{ts}]", f"[{self.level.name:8s}]"]
        if self.logger_name:
            parts.append(f"[{self.logger_name}]")
        if self.correlation_id:
            parts.append(f"[{self.correlation_id[:8]}]")
        parts.append(self.message)
        if self.extra:
            parts.append(str(self.extra))
        return " ".join(parts)


class LogHandler:
    """Base log handler."""

    def __init__(self, level: LogLevel = LogLevel.DEBUG) -> None:
        self.level = level
        self.enabled = True

    def handle(self, record: LogRecord) -> None:
        if not self.enabled or record.level < self.level:
            return
        self._emit(record)

    def _emit(self, record: LogRecord) -> None:
        pass


class ConsoleHandler(LogHandler):
    """Outputs logs to console/stdout."""

    def __init__(
        self,
        level: LogLevel = LogLevel.DEBUG,
        format_json: bool = False,
    ) -> None:
        super().__init__(level)
        self._format_json = format_json

    def _emit(self, record: LogRecord) -> None:
        if self._format_json:
            print(record.to_json())
        else:
            print(record.to_text())


class BufferHandler(LogHandler):
    """Buffers log records in memory."""

    def __init__(
        self,
        level: LogLevel = LogLevel.DEBUG,
        max_records: int = 10000,
    ) -> None:
        super().__init__(level)
        self._buffer: Deque[LogRecord] = deque(maxlen=max_records)
        self._lock = threading.Lock()

    def _emit(self, record: LogRecord) -> None:
        with self._lock:
            self._buffer.append(record)

    def get_records(
        self,
        level: Optional[LogLevel] = None,
        limit: int = 100,
    ) -> List[LogRecord]:
        with self._lock:
            records = list(self._buffer)
        if level:
            records = [r for r in records if r.level >= level]
        return records[-limit:]

    def clear(self) -> None:
        with self._lock:
            self._buffer.clear()

    @property
    def size(self) -> int:
        return len(self._buffer)


class CallbackHandler(LogHandler):
    """Calls a user-provided function for each log record."""

    def __init__(
        self,
        callback: Callable[[LogRecord], None],
        level: LogLevel = LogLevel.DEBUG,
    ) -> None:
        super().__init__(level)
        self._callback = callback

    def _emit(self, record: LogRecord) -> None:
        self._callback(record)


# Thread-local storage for correlation IDs
_log_context = threading.local()


class Logger:
    """Structured logger with correlation ID support."""

    def __init__(
        self,
        name: str = "",
        level: LogLevel = LogLevel.DEBUG,
        handlers: Optional[List[LogHandler]] = None,
    ) -> None:
        self.name = name
        self.level = level
        self._handlers = handlers or []
        self._default_context: Dict[str, Any] = {}

    def set_context(self, **kwargs: Any) -> None:
        """Set default context fields for all log records."""
        self._default_context.update(kwargs)

    def add_handler(self, handler: LogHandler) -> None:
        self._handlers.append(handler)

    def _log(
        self,
        level: LogLevel,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
    ) -> None:
        if level < self.level:
            return

        cid = correlation_id or getattr(_log_context, "correlation_id", None)

        record = LogRecord(
            level=level,
            message=message,
            logger_name=self.name,
            correlation_id=cid,
            context=dict(self._default_context),
            extra=extra or {},
        )

        for handler in self._handlers:
            try:
                handler.handle(record)
            except Exception:
                pass

    def trace(self, message: str, **kwargs: Any) -> None:
        self._log(LogLevel.TRACE, message, kwargs)

    def debug(self, message: str, **kwargs: Any) -> None:
        self._log(LogLevel.DEBUG, message, kwargs)

    def info(self, message: str, **kwargs: Any) -> None:
        self._log(LogLevel.INFO, message, kwargs)

    def warning(self, message: str, **kwargs: Any) -> None:
        self._log(LogLevel.WARNING, message, kwargs)

    def error(self, message: str, **kwargs: Any) -> None:
        self._log(LogLevel.ERROR, message, kwargs)

    def critical(self, message: str, **kwargs: Any) -> None:
        self._log(LogLevel.CRITICAL, message, kwargs)

    def child(self, name: str) -> "Logger":
        """Create a child logger with inherited handlers."""
        child_name = f"{self.name}.{name}" if self.name else name
        child = Logger(child_name, self.level, list(self._handlers))
        child._default_context = dict(self._default_context)
        return child


def set_correlation_id(correlation_id: Optional[str] = None) -> str:
    """Set the correlation ID for the current thread."""
    cid = correlation_id or str(uuid.uuid4())
    _log_context.correlation_id = cid
    return cid


def get_correlation_id() -> Optional[str]:
    """Get the current thread's correlation ID."""
    return getattr(_log_context, "correlation_id", None)


def clear_correlation_id() -> None:
    """Clear the current thread's correlation ID."""
    _log_context.correlation_id = None
