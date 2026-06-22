"""
Application configuration module.

This module provides different configuration classes for different environments
(development, testing, production) with proper validation and defaults.
"""

from dataclasses import dataclass, field
from functools import lru_cache
import json
import os
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


def _join_base_and_path(base_url: str, path: str) -> str:
    normalized_base = base_url.rstrip("/")
    normalized_path = path.strip()
    if not normalized_path.startswith("/"):
        normalized_path = f"/{normalized_path}"
    return f"{normalized_base}{normalized_path}"


@dataclass
class BaseConfig:
    """Base configuration class with common settings."""

    # Application URLs
    BACKEND_PUBLIC_BASE_URL: str = "http://localhost:5050"
    GAME_WS_PUBLIC_BASE_URL: str = "http://localhost:5050"
    CHAT_WS_PUBLIC_BASE_URL: str = "http://localhost:5050"
    FRONTEND_PUBLIC_BASE_URL: str = "http://localhost:5173"
    GOOGLE_OAUTH_REDIRECT_PATH: str = "/api/v1/auth/google/callback"
    FRONTEND_VERIFY_SUCCESS_PATH: str = "/verify/success"
    FRONTEND_VERIFY_FAILURE_PATH: str = "/verify/failure"
    FRONTEND_OAUTH_SUCCESS_PATH: str = "/lobby"
    FRONTEND_OAUTH_FAILURE_PATH: str = "/?auth_error=oauth"
    FRONTEND_OAUTH_LINK_SUCCESS_PATH: str = "/profile?google_linked=1"
    FRONTEND_OAUTH_LINK_FAILURE_PATH: str = "/profile?google_link_error=1"
    FRONTEND_VERIFY_SUCCESS_URL: str = "http://localhost:5173/verify/success"
    FRONTEND_VERIFY_FAILURE_URL: str = "http://localhost:5173/verify/failure"
    FRONTEND_OAUTH_SUCCESS_URL: str = "http://localhost:5173/lobby"
    FRONTEND_OAUTH_FAILURE_URL: str = "http://localhost:5173/?auth_error=oauth"
    FRONTEND_OAUTH_LINK_SUCCESS_URL: str = "http://localhost:5173/profile?google_linked=1"
    FRONTEND_OAUTH_LINK_FAILURE_URL: str = "http://localhost:5173/profile?google_link_error=1"
    CORS_ALLOWED_ORIGINS: list[str] = field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )

    # Server Settings
    FASTAPI_RUN_HOST: str = "0.0.0.0"
    FASTAPI_RUN_PORT: int = 5050
    MAIN_APP_INCLUDE_GAME_WS: bool = True
    DEFAULT_GAME_SERVER_ID: str = "game-server-default"
    DEFAULT_GAME_SERVER_REGION: str = "us-west-2"
    GAME_SERVER_REGISTRY_JSON: str = ""
    GAME_SERVER_INTERNAL_TOKEN: str = ""
    GAME_SERVER_HEARTBEAT_TTL_SECONDS: int = 20
    GAME_SERVER_HEARTBEAT_INTERVAL_SECONDS: int = 5
    CONTROL_PLANE_INTERNAL_BASE_URL: str = "http://localhost:5050"
    GAME_SERVER_SELF_ID: str = ""
    GAME_SERVER_SELF_REGION: str = ""
    GAME_SERVER_SELF_OFFICIAL_KEYS: str = ""
    GAME_SERVER_SELF_SIGNING_SECRET: str = ""
    GAME_SERVER_CREDENTIALS_JSON: str = ""
    GAME_SERVER_SIGNATURE_MAX_SKEW_SECONDS: int = 60
    DEV_ADMIN_TOKEN: str = ""

    # Security Settings
    SECRET_KEY: str = ""
    JWT_SECRET_KEY: str = ""
    JWT_COOKIE_SECURE: bool = True
    JWT_COOKIE_SAMESITE: Optional[str] = "Lax"
    JWT_COOKIE_DOMAIN: Optional[str] = None
    CSRF_HEADER_NAME: str = "X-CSRF-TOKEN"
    EMAIL_VERIFY_TOKEN_TTL_HOURS: int = 24
    AUTH_REQUIRE_EMAIL_VERIFICATION: bool = False
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_OAUTH_REDIRECT_URI: str = "http://localhost:5050/api/v1/auth/google/callback"

    # Auth endpoint rate limits
    AUTH_RATE_LIMIT_LOGIN_MAX: int = 10
    AUTH_RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = 60
    AUTH_RATE_LIMIT_REGISTER_MAX: int = 5
    AUTH_RATE_LIMIT_REGISTER_WINDOW_SECONDS: int = 300
    AUTH_RATE_LIMIT_RESEND_MAX: int = 5
    AUTH_RATE_LIMIT_RESEND_WINDOW_SECONDS: int = 300
    WS_RATE_LIMIT_CONNECT_MAX: int = 30
    WS_RATE_LIMIT_CONNECT_WINDOW_SECONDS: int = 30
    WS_RATE_LIMIT_MESSAGES_MAX: int = 180
    WS_RATE_LIMIT_MESSAGES_WINDOW_SECONDS: int = 10

    # Application Constants
    APP_NAME: str = "GodHand"

    @staticmethod
    def _to_bool(value: str | None, default: bool) -> bool:
        if value is None:
            return default
        return value.strip().lower() in {"1", "true", "yes", "on"}

    @staticmethod
    def _to_csv_list(value: str | None, default: list[str]) -> list[str]:
        if value is None:
            return default
        parsed = [item.strip() for item in value.split(",") if item.strip()]
        return parsed or default

    @staticmethod
    def _to_json_object(value: str | None, default: dict[str, object]) -> dict[str, object]:
        if value is None or not value.strip():
            return default
        try:
            parsed = json.loads(value)
        except Exception:
            return default
        if not isinstance(parsed, dict):
            return default
        return parsed

    @classmethod
    def from_env(cls) -> "BaseConfig":
        """Create configuration instance from environment variables."""
        default_cors = cls().CORS_ALLOWED_ORIGINS
        backend_public_base_url = os.getenv("BACKEND_PUBLIC_BASE_URL", cls.BACKEND_PUBLIC_BASE_URL)
        game_ws_public_base_url = os.getenv("GAME_WS_PUBLIC_BASE_URL", backend_public_base_url)
        chat_ws_public_base_url = os.getenv("CHAT_WS_PUBLIC_BASE_URL", backend_public_base_url)
        frontend_public_base_url = os.getenv("FRONTEND_PUBLIC_BASE_URL", cls.FRONTEND_PUBLIC_BASE_URL)
        google_oauth_redirect_path = os.getenv(
            "GOOGLE_OAUTH_REDIRECT_PATH",
            cls.GOOGLE_OAUTH_REDIRECT_PATH,
        )
        frontend_verify_success_path = os.getenv(
            "FRONTEND_VERIFY_SUCCESS_PATH",
            cls.FRONTEND_VERIFY_SUCCESS_PATH,
        )
        frontend_verify_failure_path = os.getenv(
            "FRONTEND_VERIFY_FAILURE_PATH",
            cls.FRONTEND_VERIFY_FAILURE_PATH,
        )
        frontend_oauth_success_path = os.getenv(
            "FRONTEND_OAUTH_SUCCESS_PATH",
            cls.FRONTEND_OAUTH_SUCCESS_PATH,
        )
        frontend_oauth_failure_path = os.getenv(
            "FRONTEND_OAUTH_FAILURE_PATH",
            cls.FRONTEND_OAUTH_FAILURE_PATH,
        )
        frontend_oauth_link_success_path = os.getenv(
            "FRONTEND_OAUTH_LINK_SUCCESS_PATH",
            cls.FRONTEND_OAUTH_LINK_SUCCESS_PATH,
        )
        frontend_oauth_link_failure_path = os.getenv(
            "FRONTEND_OAUTH_LINK_FAILURE_PATH",
            cls.FRONTEND_OAUTH_LINK_FAILURE_PATH,
        )
        return cls(
            BACKEND_PUBLIC_BASE_URL=backend_public_base_url,
            GAME_WS_PUBLIC_BASE_URL=game_ws_public_base_url,
            CHAT_WS_PUBLIC_BASE_URL=chat_ws_public_base_url,
            FRONTEND_PUBLIC_BASE_URL=frontend_public_base_url,
            GOOGLE_OAUTH_REDIRECT_PATH=google_oauth_redirect_path,
            FRONTEND_VERIFY_SUCCESS_PATH=frontend_verify_success_path,
            FRONTEND_VERIFY_FAILURE_PATH=frontend_verify_failure_path,
            FRONTEND_OAUTH_SUCCESS_PATH=frontend_oauth_success_path,
            FRONTEND_OAUTH_FAILURE_PATH=frontend_oauth_failure_path,
            FRONTEND_OAUTH_LINK_SUCCESS_PATH=frontend_oauth_link_success_path,
            FRONTEND_OAUTH_LINK_FAILURE_PATH=frontend_oauth_link_failure_path,
            FRONTEND_VERIFY_SUCCESS_URL=_join_base_and_path(
                frontend_public_base_url,
                frontend_verify_success_path,
            ),
            FRONTEND_VERIFY_FAILURE_URL=_join_base_and_path(
                frontend_public_base_url,
                frontend_verify_failure_path,
            ),
            FRONTEND_OAUTH_SUCCESS_URL=_join_base_and_path(
                frontend_public_base_url,
                frontend_oauth_success_path,
            ),
            FRONTEND_OAUTH_FAILURE_URL=_join_base_and_path(
                frontend_public_base_url,
                frontend_oauth_failure_path,
            ),
            FRONTEND_OAUTH_LINK_SUCCESS_URL=_join_base_and_path(
                frontend_public_base_url,
                frontend_oauth_link_success_path,
            ),
            FRONTEND_OAUTH_LINK_FAILURE_URL=_join_base_and_path(
                frontend_public_base_url,
                frontend_oauth_link_failure_path,
            ),
            FASTAPI_RUN_HOST=os.getenv("FASTAPI_RUN_HOST", "0.0.0.0"),
            FASTAPI_RUN_PORT=int(os.getenv("FASTAPI_RUN_PORT", "5050")),
            MAIN_APP_INCLUDE_GAME_WS=cls._to_bool(
                os.getenv("MAIN_APP_INCLUDE_GAME_WS"),
                cls.MAIN_APP_INCLUDE_GAME_WS,
            ),
            DEFAULT_GAME_SERVER_ID=os.getenv("DEFAULT_GAME_SERVER_ID", cls.DEFAULT_GAME_SERVER_ID),
            DEFAULT_GAME_SERVER_REGION=os.getenv(
                "DEFAULT_GAME_SERVER_REGION",
                cls.DEFAULT_GAME_SERVER_REGION,
            ),
            GAME_SERVER_REGISTRY_JSON=os.getenv(
                "GAME_SERVER_REGISTRY_JSON",
                cls.GAME_SERVER_REGISTRY_JSON,
            ),
            GAME_SERVER_INTERNAL_TOKEN=os.getenv(
                "GAME_SERVER_INTERNAL_TOKEN",
                cls.GAME_SERVER_INTERNAL_TOKEN,
            ),
            GAME_SERVER_HEARTBEAT_TTL_SECONDS=int(
                os.getenv(
                    "GAME_SERVER_HEARTBEAT_TTL_SECONDS",
                    str(cls.GAME_SERVER_HEARTBEAT_TTL_SECONDS),
                )
            ),
            GAME_SERVER_HEARTBEAT_INTERVAL_SECONDS=int(
                os.getenv(
                    "GAME_SERVER_HEARTBEAT_INTERVAL_SECONDS",
                    str(cls.GAME_SERVER_HEARTBEAT_INTERVAL_SECONDS),
                )
            ),
            CONTROL_PLANE_INTERNAL_BASE_URL=os.getenv(
                "CONTROL_PLANE_INTERNAL_BASE_URL",
                cls.CONTROL_PLANE_INTERNAL_BASE_URL,
            ),
            GAME_SERVER_SELF_ID=os.getenv("GAME_SERVER_SELF_ID", cls.GAME_SERVER_SELF_ID),
            GAME_SERVER_SELF_REGION=os.getenv("GAME_SERVER_SELF_REGION", cls.GAME_SERVER_SELF_REGION),
            GAME_SERVER_SELF_OFFICIAL_KEYS=os.getenv(
                "GAME_SERVER_SELF_OFFICIAL_KEYS",
                cls.GAME_SERVER_SELF_OFFICIAL_KEYS,
            ),
            GAME_SERVER_SELF_SIGNING_SECRET=os.getenv(
                "GAME_SERVER_SELF_SIGNING_SECRET",
                cls.GAME_SERVER_SELF_SIGNING_SECRET,
            ),
            GAME_SERVER_CREDENTIALS_JSON=os.getenv(
                "GAME_SERVER_CREDENTIALS_JSON",
                cls.GAME_SERVER_CREDENTIALS_JSON,
            ),
            GAME_SERVER_SIGNATURE_MAX_SKEW_SECONDS=int(
                os.getenv(
                    "GAME_SERVER_SIGNATURE_MAX_SKEW_SECONDS",
                    str(cls.GAME_SERVER_SIGNATURE_MAX_SKEW_SECONDS),
                )
            ),
            DEV_ADMIN_TOKEN=os.getenv("DEV_ADMIN_TOKEN", cls.DEV_ADMIN_TOKEN),
            SECRET_KEY=cls._get_required_secret_env("SECRET_KEY", min_length=32),
            JWT_SECRET_KEY=cls._get_required_secret_env("JWT_SECRET_KEY", min_length=32),
            JWT_COOKIE_SECURE=cls._to_bool(os.getenv("JWT_COOKIE_SECURE"), cls.JWT_COOKIE_SECURE),
            JWT_COOKIE_SAMESITE=os.getenv("JWT_COOKIE_SAMESITE", cls.JWT_COOKIE_SAMESITE),
            JWT_COOKIE_DOMAIN=(os.getenv("JWT_COOKIE_DOMAIN") or cls.JWT_COOKIE_DOMAIN or "").strip() or None,
            CSRF_HEADER_NAME=os.getenv("CSRF_HEADER_NAME", cls.CSRF_HEADER_NAME),
            EMAIL_VERIFY_TOKEN_TTL_HOURS=int(
                os.getenv("EMAIL_VERIFY_TOKEN_TTL_HOURS", str(cls.EMAIL_VERIFY_TOKEN_TTL_HOURS))
            ),
            AUTH_REQUIRE_EMAIL_VERIFICATION=cls._to_bool(
                os.getenv("AUTH_REQUIRE_EMAIL_VERIFICATION"),
                cls.AUTH_REQUIRE_EMAIL_VERIFICATION,
            ),
            GOOGLE_CLIENT_ID=os.getenv("GOOGLE_CLIENT_ID", cls.GOOGLE_CLIENT_ID),
            GOOGLE_CLIENT_SECRET=os.getenv("GOOGLE_CLIENT_SECRET", cls.GOOGLE_CLIENT_SECRET),
            GOOGLE_OAUTH_REDIRECT_URI=_join_base_and_path(
                backend_public_base_url,
                google_oauth_redirect_path,
            ),
            AUTH_RATE_LIMIT_LOGIN_MAX=int(
                os.getenv("AUTH_RATE_LIMIT_LOGIN_MAX", str(cls.AUTH_RATE_LIMIT_LOGIN_MAX))
            ),
            AUTH_RATE_LIMIT_LOGIN_WINDOW_SECONDS=int(
                os.getenv(
                    "AUTH_RATE_LIMIT_LOGIN_WINDOW_SECONDS",
                    str(cls.AUTH_RATE_LIMIT_LOGIN_WINDOW_SECONDS),
                )
            ),
            AUTH_RATE_LIMIT_REGISTER_MAX=int(
                os.getenv("AUTH_RATE_LIMIT_REGISTER_MAX", str(cls.AUTH_RATE_LIMIT_REGISTER_MAX))
            ),
            AUTH_RATE_LIMIT_REGISTER_WINDOW_SECONDS=int(
                os.getenv(
                    "AUTH_RATE_LIMIT_REGISTER_WINDOW_SECONDS",
                    str(cls.AUTH_RATE_LIMIT_REGISTER_WINDOW_SECONDS),
                )
            ),
            AUTH_RATE_LIMIT_RESEND_MAX=int(
                os.getenv("AUTH_RATE_LIMIT_RESEND_MAX", str(cls.AUTH_RATE_LIMIT_RESEND_MAX))
            ),
            AUTH_RATE_LIMIT_RESEND_WINDOW_SECONDS=int(
                os.getenv(
                    "AUTH_RATE_LIMIT_RESEND_WINDOW_SECONDS",
                    str(cls.AUTH_RATE_LIMIT_RESEND_WINDOW_SECONDS),
                )
            ),
            WS_RATE_LIMIT_CONNECT_MAX=int(
                os.getenv("WS_RATE_LIMIT_CONNECT_MAX", str(cls.WS_RATE_LIMIT_CONNECT_MAX))
            ),
            WS_RATE_LIMIT_CONNECT_WINDOW_SECONDS=int(
                os.getenv(
                    "WS_RATE_LIMIT_CONNECT_WINDOW_SECONDS",
                    str(cls.WS_RATE_LIMIT_CONNECT_WINDOW_SECONDS),
                )
            ),
            WS_RATE_LIMIT_MESSAGES_MAX=int(
                os.getenv("WS_RATE_LIMIT_MESSAGES_MAX", str(cls.WS_RATE_LIMIT_MESSAGES_MAX))
            ),
            WS_RATE_LIMIT_MESSAGES_WINDOW_SECONDS=int(
                os.getenv(
                    "WS_RATE_LIMIT_MESSAGES_WINDOW_SECONDS",
                    str(cls.WS_RATE_LIMIT_MESSAGES_WINDOW_SECONDS),
                )
            ),
            CORS_ALLOWED_ORIGINS=cls._to_csv_list(
                os.getenv("CORS_ALLOWED_ORIGINS"),
                default_cors,
            ),
        )

    @staticmethod
    def _get_required_env(key: str) -> str:
        """Get required environment variable or raise an error."""
        value = os.getenv(key)
        if not value:
            raise ValueError(f"Required environment variable '{key}' is not set")
        return value

    @staticmethod
    def _get_required_secret_env(key: str, *, min_length: int) -> str:
        """Get required secret env var and enforce minimum entropy length."""
        value = BaseConfig._get_required_env(key)
        if len(value.encode("utf-8")) < min_length:
            raise ValueError(
                f"Environment variable '{key}' must be at least {min_length} bytes long"
            )
        return value


class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""

    TESTING: bool = False
    IS_DEV: bool = True
    JWT_COOKIE_SECURE: bool = False


class ProductionConfig(BaseConfig):
    """Production environment configuration."""

    TESTING: bool = False
    IS_DEV: bool = False


class TestingConfig(BaseConfig):
    """Testing environment configuration."""

    TESTING: bool = True
    IS_DEV: bool = True
    JWT_COOKIE_SECURE: bool = False


def _build_config() -> BaseConfig:
    """Build a config instance based on FASTAPI_ENV."""
    env = os.getenv("FASTAPI_ENV", "development").lower()
    config_classes = {
        "development": DevelopmentConfig,
        "production": ProductionConfig,
        "testing": TestingConfig,
    }
    config_class = config_classes.get(env, TestingConfig)
    return config_class.from_env()


@lru_cache(maxsize=1)
def get_app_config() -> BaseConfig:
    """
    Singleton accessor for the application config.
    Reads env once on first call, then returns the cached instance.
    """
    return _build_config()


def reset_settings_cache() -> None:
    """Clear the cached config (useful for tests before reloading)."""
    get_app_config.cache_clear()
