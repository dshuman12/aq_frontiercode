"""Configuration schema definition and validation."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Optional


class ConfigValidationError(Exception):
    """Raised when configuration validation fails."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__(f"Configuration validation failed: {'; '.join(errors)}")


@dataclass
class RateLimitConfig:
    enabled: bool = True
    requests_per_minute: int = 60
    burst_size: int = 10

    def validate(self) -> list[str]:
        errors = []
        if self.requests_per_minute < 1:
            errors.append("rate_limit.requests_per_minute must be >= 1")
        if self.burst_size < 1:
            errors.append("rate_limit.burst_size must be >= 1")
        if self.burst_size > self.requests_per_minute:
            errors.append("rate_limit.burst_size cannot exceed requests_per_minute")
        return errors


@dataclass
class AppConfig:
    name: str = "nexusflow"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1

    def validate(self) -> list[str]:
        errors = []
        if not self.name or not re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', self.name):
            errors.append("app.name must be alphanumeric (starting with a letter)")
        if self.port < 1 or self.port > 65535:
            errors.append(f"app.port must be 1-65535, got {self.port}")
        if self.workers < 1 or self.workers > 32:
            errors.append(f"app.workers must be 1-32, got {self.workers}")
        return errors


@dataclass
class DatabaseConfig:
    host: str = "localhost"
    port: int = 5432
    name: str = "nexusflow"
    user: str = "nexusflow"
    password: str = ""
    pool_size: int = 5
    pool_overflow: int = 10
    pool_timeout: int = 30
    echo: bool = False

    def validate(self) -> list[str]:
        errors = []
        if self.port < 1 or self.port > 65535:
            errors.append(f"database.port must be 1-65535, got {self.port}")
        if self.pool_size < 1:
            errors.append("database.pool_size must be >= 1")
        if self.pool_overflow < 0:
            errors.append("database.pool_overflow must be >= 0")
        if self.pool_timeout < 1:
            errors.append("database.pool_timeout must be >= 1")
        return errors

    @property
    def connection_string(self) -> str:
        """Build a connection string from components."""
        auth = f"{self.user}:{self.password}@" if self.user else ""
        return f"postgresql://{auth}{self.host}:{self.port}/{self.name}"


@dataclass
class AuthConfig:
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_ttl: int = 3600
    refresh_token_ttl: int = 86400
    session_ttl: int = 7200
    max_sessions_per_user: int = 5
    rate_limit: RateLimitConfig = field(default_factory=RateLimitConfig)

    def validate(self) -> list[str]:
        errors = []
        if self.algorithm not in ("HS256", "HS384", "HS512", "RS256", "RS384", "RS512"):
            errors.append(f"auth.algorithm '{self.algorithm}' is not supported")
        if self.access_token_ttl < 60:
            errors.append("auth.access_token_ttl must be >= 60 seconds")
        if self.refresh_token_ttl <= self.access_token_ttl:
            errors.append("auth.refresh_token_ttl must be > access_token_ttl")
        if self.session_ttl < 60:
            errors.append("auth.session_ttl must be >= 60 seconds")
        if self.max_sessions_per_user < 1:
            errors.append("auth.max_sessions_per_user must be >= 1")
        errors.extend(self.rate_limit.validate())
        return errors


@dataclass
class CacheConfig:
    enabled: bool = True
    backend: str = "memory"
    ttl: int = 300
    max_size: int = 1000

    def validate(self) -> list[str]:
        errors = []
        if self.backend not in ("memory", "redis", "null"):
            errors.append(f"cache.backend '{self.backend}' is not supported")
        if self.ttl < 0:
            errors.append("cache.ttl must be >= 0")
        if self.max_size < 1:
            errors.append("cache.max_size must be >= 1")
        return errors


@dataclass
class EventsConfig:
    async_dispatch: bool = True
    max_handlers_per_event: int = 50
    replay_enabled: bool = False
    replay_retention_days: int = 30

    def validate(self) -> list[str]:
        errors = []
        if self.max_handlers_per_event < 1:
            errors.append("events.max_handlers_per_event must be >= 1")
        if self.replay_retention_days < 1 and self.replay_enabled:
            errors.append("events.replay_retention_days must be >= 1 when replay is enabled")
        return errors


@dataclass
class TasksConfig:
    max_workers: int = 4
    max_retries: int = 3
    retry_backoff_base: float = 2.0
    retry_backoff_max: int = 300
    dead_letter_enabled: bool = True
    dead_letter_max_age: int = 86400

    def validate(self) -> list[str]:
        errors = []
        if self.max_workers < 1:
            errors.append("tasks.max_workers must be >= 1")
        if self.max_retries < 0:
            errors.append("tasks.max_retries must be >= 0")
        if self.retry_backoff_base < 1.0:
            errors.append("tasks.retry_backoff_base must be >= 1.0")
        if self.retry_backoff_max < 1:
            errors.append("tasks.retry_backoff_max must be >= 1")
        return errors


@dataclass
class PluginsConfig:
    enabled: bool = True
    auto_discover: bool = True
    plugin_dirs: list[str] = field(default_factory=lambda: ["plugins"])
    sandbox_enabled: bool = False

    def validate(self) -> list[str]:
        return []


@dataclass
class TelemetryConfig:
    metrics_enabled: bool = True
    tracing_enabled: bool = False
    log_level: str = "INFO"
    correlation_id_header: str = "X-Correlation-ID"

    def validate(self) -> list[str]:
        errors = []
        valid_levels = ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL")
        if self.log_level.upper() not in valid_levels:
            errors.append(f"telemetry.log_level must be one of {valid_levels}")
        return errors


@dataclass
class ConfigSchema:
    """Top-level configuration schema with validation."""

    app: AppConfig = field(default_factory=AppConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    auth: AuthConfig = field(default_factory=AuthConfig)
    cache: CacheConfig = field(default_factory=CacheConfig)
    events: EventsConfig = field(default_factory=EventsConfig)
    tasks: TasksConfig = field(default_factory=TasksConfig)
    plugins: PluginsConfig = field(default_factory=PluginsConfig)
    telemetry: TelemetryConfig = field(default_factory=TelemetryConfig)

    def validate(self) -> list[str]:
        """Validate all configuration sections. Returns list of error messages."""
        errors = []
        errors.extend(self.app.validate())
        errors.extend(self.database.validate())
        errors.extend(self.auth.validate())
        errors.extend(self.cache.validate())
        errors.extend(self.events.validate())
        errors.extend(self.tasks.validate())
        errors.extend(self.plugins.validate())
        errors.extend(self.telemetry.validate())
        return errors

    def validate_or_raise(self) -> None:
        """Validate and raise ConfigValidationError if any errors are found."""
        errors = self.validate()
        if errors:
            raise ConfigValidationError(errors)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ConfigSchema":
        """
        Create a ConfigSchema from a dictionary.

        Handles nested config sections and type coercion.
        """
        schema = cls()

        if "app" in data:
            schema.app = cls._make_dataclass(AppConfig, data["app"])
        if "database" in data:
            schema.database = cls._make_dataclass(DatabaseConfig, data["database"])
        if "auth" in data:
            auth_data = data["auth"].copy() if isinstance(data["auth"], dict) else {}
            rate_limit_data = auth_data.pop("rate_limit", None)
            schema.auth = cls._make_dataclass(AuthConfig, auth_data)
            if rate_limit_data and isinstance(rate_limit_data, dict):
                schema.auth.rate_limit = cls._make_dataclass(RateLimitConfig, rate_limit_data)
        if "cache" in data:
            schema.cache = cls._make_dataclass(CacheConfig, data["cache"])
        if "events" in data:
            schema.events = cls._make_dataclass(EventsConfig, data["events"])
        if "tasks" in data:
            schema.tasks = cls._make_dataclass(TasksConfig, data["tasks"])
        if "plugins" in data:
            schema.plugins = cls._make_dataclass(PluginsConfig, data["plugins"])
        if "telemetry" in data:
            schema.telemetry = cls._make_dataclass(TelemetryConfig, data["telemetry"])

        return schema

    @staticmethod
    def _make_dataclass(cls: type, data: dict[str, Any]) -> Any:
        """Create a dataclass instance from a dict, ignoring unknown fields."""
        if not isinstance(data, dict):
            return cls()

        import dataclasses
        valid_fields = {f.name for f in dataclasses.fields(cls)}
        filtered = {k: v for k, v in data.items() if k in valid_fields and v is not None}
        return cls(**filtered)
