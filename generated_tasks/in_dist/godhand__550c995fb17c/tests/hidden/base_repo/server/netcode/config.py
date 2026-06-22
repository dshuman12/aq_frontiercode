from __future__ import annotations

import os
from dataclasses import dataclass


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    if value is None:
        return default
    value = value.strip()
    return value if value else default


def _env_int(name: str, default: int, *, minimum: int | None = None, maximum: int | None = None) -> int:
    raw = os.getenv(name)
    if raw is None:
        value = default
    else:
        try:
            value = int(raw.strip())
        except (TypeError, ValueError):
            value = default
    if minimum is not None:
        value = max(minimum, value)
    if maximum is not None:
        value = min(maximum, value)
    return value


def _env_float(name: str, default: float, *, minimum: float | None = None, maximum: float | None = None) -> float:
    raw = os.getenv(name)
    if raw is None:
        value = default
    else:
        try:
            value = float(raw.strip())
        except (TypeError, ValueError):
            value = default
    if minimum is not None:
        value = max(minimum, value)
    if maximum is not None:
        value = min(maximum, value)
    return value


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    value = raw.strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    return default


@dataclass(slots=True, frozen=True)
class NetcodeSettings:
    """Configuration for the standalone authoritative netcode service."""

    host: str = "0.0.0.0"
    port: int = 8765

    tick_rate_hz: int = 20
    snapshot_rate_hz: int = 10
    autosave_interval_sec: int = 10
    idle_room_ttl_sec: int = 300
    cleanup_interval_sec: int = 20

    world_width: int = 512
    world_height: int = 512
    max_players_per_room: int = 16
    max_message_bytes: int = 32_768

    auth_token_ttl_sec: int = 86_400
    auth_secret: str = "change-me-netcode-secret"
    admin_api_key: str = "change-me-netcode-admin-key"
    insecure_allow_anonymous_tokens: bool = False

    save_db_path: str = "server/netcode/data/netcode.sqlite3"
    command_audit_enabled: bool = True

    @classmethod
    def from_env(cls) -> "NetcodeSettings":
        return cls(
            host=_env("NETCODE_HOST", "0.0.0.0"),
            port=_env_int("NETCODE_PORT", 8765, minimum=1, maximum=65535),
            tick_rate_hz=_env_int("NETCODE_TICK_RATE_HZ", 20, minimum=5, maximum=120),
            snapshot_rate_hz=_env_int("NETCODE_SNAPSHOT_RATE_HZ", 10, minimum=1, maximum=120),
            autosave_interval_sec=_env_int("NETCODE_AUTOSAVE_INTERVAL_SEC", 10, minimum=1, maximum=3600),
            idle_room_ttl_sec=_env_int("NETCODE_IDLE_ROOM_TTL_SEC", 300, minimum=10, maximum=86400),
            cleanup_interval_sec=_env_int("NETCODE_CLEANUP_INTERVAL_SEC", 20, minimum=5, maximum=3600),
            world_width=_env_int("NETCODE_WORLD_WIDTH", 512, minimum=32, maximum=4096),
            world_height=_env_int("NETCODE_WORLD_HEIGHT", 512, minimum=32, maximum=4096),
            max_players_per_room=_env_int("NETCODE_MAX_PLAYERS_PER_ROOM", 16, minimum=1, maximum=256),
            max_message_bytes=_env_int("NETCODE_MAX_MESSAGE_BYTES", 32768, minimum=512, maximum=2_000_000),
            auth_token_ttl_sec=_env_int("NETCODE_AUTH_TOKEN_TTL_SEC", 86_400, minimum=60, maximum=31_536_000),
            auth_secret=_env("NETCODE_AUTH_SECRET", "change-me-netcode-secret"),
            admin_api_key=_env("NETCODE_ADMIN_API_KEY", "change-me-netcode-admin-key"),
            insecure_allow_anonymous_tokens=_env_bool("NETCODE_INSECURE_ALLOW_ANONYMOUS_TOKENS", False),
            save_db_path=_env("NETCODE_SAVE_DB_PATH", "server/netcode/data/netcode.sqlite3"),
            command_audit_enabled=_env_bool("NETCODE_COMMAND_AUDIT_ENABLED", True),
        )
