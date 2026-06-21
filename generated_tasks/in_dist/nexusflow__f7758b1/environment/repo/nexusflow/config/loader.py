"""Configuration loading from YAML files, environment variables, and defaults."""

from __future__ import annotations

import os
import logging
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

_UNSET = object()


class ConfigLoader:
    """
    Loads configuration from multiple sources with precedence:
    1. Environment variables (highest)
    2. Config file (YAML)
    3. Defaults (lowest)

    Environment variables are mapped using a prefix and double-underscore separators.
    e.g., NEXUS__DATABASE__HOST -> {"database": {"host": "..."}}
    """

    def __init__(
        self,
        config_path: Optional[str] = None,
        env_prefix: str = "NEXUS",
        defaults: Optional[dict[str, Any]] = None,
    ) -> None:
        self._config_path = config_path
        self._env_prefix = env_prefix.upper().rstrip("_")
        self._defaults = defaults or self._get_builtin_defaults()

    def _get_builtin_defaults(self) -> dict[str, Any]:
        """Return built-in default configuration."""
        return {
            "app": {
                "name": "nexusflow",
                "debug": False,
                "host": "0.0.0.0",
                "port": 8000,
                "workers": 1,
            },
            "database": {
                "host": "localhost",
                "port": 5432,
                "name": "nexusflow",
                "user": "nexusflow",
                "password": "",
                "pool_size": 5,
                "pool_overflow": 10,
                "pool_timeout": 30,
                "echo": False,
            },
            "auth": {
                "secret_key": "",
                "algorithm": "HS256",
                "access_token_ttl": 3600,
                "refresh_token_ttl": 86400,
                "session_ttl": 7200,
                "max_sessions_per_user": 5,
                "rate_limit": {
                    "enabled": True,
                    "requests_per_minute": 60,
                    "burst_size": 10,
                },
            },
            "cache": {
                "enabled": True,
                "backend": "memory",
                "ttl": 300,
                "max_size": 1000,
            },
            "events": {
                "async_dispatch": True,
                "max_handlers_per_event": 50,
                "replay_enabled": False,
                "replay_retention_days": 30,
            },
            "tasks": {
                "max_workers": 4,
                "max_retries": 3,
                "retry_backoff_base": 2.0,
                "retry_backoff_max": 300,
                "dead_letter_enabled": True,
                "dead_letter_max_age": 86400,
            },
            "plugins": {
                "enabled": True,
                "auto_discover": True,
                "plugin_dirs": ["plugins"],
                "sandbox_enabled": False,
            },
            "telemetry": {
                "metrics_enabled": True,
                "tracing_enabled": False,
                "log_level": "INFO",
                "correlation_id_header": "X-Correlation-ID",
            },
        }

    def load(self) -> dict[str, Any]:
        """Load configuration from all sources and merge."""
        config = self._deep_copy(self._defaults)

        # Load from YAML file
        if self._config_path:
            file_config = self._load_yaml(self._config_path)
            config = self._merge(config, file_config)

        # Load from environment variables
        env_config = self._load_env()
        if env_config:
            config = self._merge(config, env_config)

        return config

    def _load_yaml(self, path: str) -> dict[str, Any]:
        """Load configuration from a YAML file."""
        filepath = Path(path)
        if not filepath.exists():
            logger.warning(f"Config file not found: {path}")
            return {}

        try:
            import yaml
            with open(filepath) as f:
                data = yaml.safe_load(f)
            return data if isinstance(data, dict) else {}
        except Exception as e:
            logger.error(f"Failed to load config file {path}: {e}")
            return {}

    def _load_env(self) -> dict[str, Any]:
        """
        Load configuration from environment variables.

        Maps NEXUS__DATABASE__HOST=value to {"database": {"host": "value"}}

        BUG CANDIDATE #5: The env var value type coercion has a subtle bug.
        When a nested key is set via env var, the _set_nested method replaces
        the value but doesn't preserve sibling keys properly when the parent
        key doesn't exist yet in the accumulator.
        """
        result: dict[str, Any] = {}
        prefix = self._env_prefix + "__"

        for key, value in sorted(os.environ.items()):
            if not key.startswith(prefix):
                continue

            # Strip prefix and split on double underscore
            config_key = key[len(prefix):]
            parts = [p.lower() for p in config_key.split("__")]

            if not parts or not all(parts):
                continue

            # Coerce value types
            coerced = self._coerce_value(value)
            self._set_nested(result, parts, coerced)

        return result

    def _coerce_value(self, value: str) -> Any:
        """Attempt to coerce a string value to its appropriate Python type."""
        if value.lower() in ("true", "yes", "1", "on"):
            return True
        if value.lower() in ("false", "no", "0", "off"):
            return False
        if value.lower() in ("null", "none", ""):
            return None

        # Try int
        try:
            return int(value)
        except (ValueError, TypeError):
            pass

        # Try float
        try:
            return float(value)
        except (ValueError, TypeError):
            pass

        return value

    def _set_nested(self, target: dict, keys: list[str], value: Any) -> None:
        """
        Set a value in a nested dict structure using a list of keys.

        BUG: When setting a deeply nested key (e.g., ["auth", "rate_limit", "enabled"]),
        if "auth" exists but "rate_limit" doesn't, this creates "rate_limit" as a new dict
        containing only "enabled". This is correct. But when "auth" doesn't exist at all,
        the intermediate dict is created without inheriting defaults, which means an env
        var like NEXUS__AUTH__RATE_LIMIT__ENABLED=false creates:
        {"auth": {"rate_limit": {"enabled": false}}} — dropping all other auth.* defaults.

        The _merge function later is supposed to handle this, but the merge order means
        env vars OVERRIDE (not merge with) the file config, which then overrides defaults.
        So if the file config also has "auth" partially set, the env var dict replaces
        the file config's "auth" subtree entirely instead of merging at the leaf level.
        """
        current = target
        for key in keys[:-1]:
            if key not in current or not isinstance(current[key], dict):
                current[key] = {}
            current = current[key]
        current[keys[-1]] = value

    def _merge(self, base: dict, override: dict) -> dict:
        """
        Deep merge override into base. Override values win.

        This is the primary merge function used during config loading.
        The merge happens in order: defaults -> file -> env.
        """
        result = {}
        all_keys = set(base.keys()) | set(override.keys())

        for key in all_keys:
            if key in base and key in override:
                base_val = base[key]
                over_val = override[key]
                if isinstance(base_val, dict) and isinstance(over_val, dict):
                    result[key] = self._merge(base_val, over_val)
                else:
                    result[key] = over_val
            elif key in base:
                result[key] = base[key]
            else:
                result[key] = override[key]

        return result

    def _deep_copy(self, obj: Any) -> Any:
        """Deep copy a nested dict/list structure without importing copy."""
        if isinstance(obj, dict):
            return {k: self._deep_copy(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._deep_copy(item) for item in obj]
        return obj
