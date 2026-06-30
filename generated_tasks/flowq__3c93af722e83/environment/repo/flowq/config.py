"""Configuration management for FlowQ.

Reads settings from environment variables with sensible defaults.
Can also be initialised programmatically for embedded use.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Optional


def _env_int(key: str, default: int) -> int:
    try:
        return int(os.environ.get(key, default))
    except (ValueError, TypeError):
        return default


def _env_float(key: str, default: float) -> float:
    try:
        return float(os.environ.get(key, default))
    except (ValueError, TypeError):
        return default


def _env_bool(key: str, default: bool) -> bool:
    val = os.environ.get(key, "").lower()
    if val in ("1", "true", "yes"):
        return True
    if val in ("0", "false", "no"):
        return False
    return default


@dataclass
class FlowQConfig:
    """Central configuration object for FlowQ.

    All fields can be set via environment variables or passed explicitly.
    Environment variables take precedence over default values but are
    overridden by explicit constructor arguments.
    """

    # Storage
    db_path: str = field(
        default_factory=lambda: os.environ.get("FLOWQ_DB_PATH", "flowq.db")
    )

    # Worker
    default_workers: int = field(
        default_factory=lambda: _env_int("FLOWQ_WORKERS", 2)
    )
    poll_interval: float = field(
        default_factory=lambda: _env_float("FLOWQ_POLL_INTERVAL", 1.0)
    )
    default_timeout: int = field(
        default_factory=lambda: _env_int("FLOWQ_DEFAULT_TIMEOUT", 300)
    )
    default_max_retries: int = field(
        default_factory=lambda: _env_int("FLOWQ_MAX_RETRIES", 3)
    )

    # Scheduler
    scheduler_tick: float = field(
        default_factory=lambda: _env_float("FLOWQ_SCHEDULER_TICK", 60.0)
    )

    # Rate limiting
    rate_limit_enabled: bool = field(
        default_factory=lambda: _env_bool("FLOWQ_RATE_LIMIT", False)
    )
    rate_limit_calls: int = field(
        default_factory=lambda: _env_int("FLOWQ_RATE_LIMIT_CALLS", 100)
    )
    rate_limit_period: float = field(
        default_factory=lambda: _env_float("FLOWQ_RATE_LIMIT_PERIOD", 60.0)
    )

    # Dead-letter queue
    dlq_enabled: bool = field(
        default_factory=lambda: _env_bool("FLOWQ_DLQ_ENABLED", True)
    )

    # Dashboard
    dashboard_host: str = field(
        default_factory=lambda: os.environ.get("FLOWQ_DASHBOARD_HOST", "127.0.0.1")
    )
    dashboard_port: int = field(
        default_factory=lambda: _env_int("FLOWQ_DASHBOARD_PORT", 8765)
    )

    # Logging
    log_level: str = field(
        default_factory=lambda: os.environ.get("FLOWQ_LOG_LEVEL", "WARNING")
    )

    def apply_logging(self) -> None:
        """Apply the configured log level to the root FlowQ logger."""
        level = getattr(logging, self.log_level.upper(), logging.WARNING)
        logging.getLogger("flowq").setLevel(level)

    def to_dict(self) -> dict:
        import dataclasses
        return dataclasses.asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "FlowQConfig":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


# Module-level default config — can be replaced by the application
default_config = FlowQConfig()
