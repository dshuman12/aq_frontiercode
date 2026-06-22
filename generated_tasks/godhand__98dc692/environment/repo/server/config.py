"""
Application configuration module.

This module provides different configuration classes for different environments
(development, testing, production) with proper validation and defaults.
"""

import os
from typing import Optional
from dataclasses import dataclass, field
from functools import lru_cache

from dotenv import load_dotenv
load_dotenv()

@dataclass
class BaseConfig:
    """Base configuration class with common settings."""

    # Application URLs
    BASE_URL: Optional[str] = None
    BASE_URL_1: Optional[str] = None
    FRONTEND_VERIFY_SUCCESS_URL: str = "http://localhost:5173/verify/success"
    FRONTEND_VERIFY_FAILURE_URL: str = "http://localhost:5173/verify/failure"
    CORS_ALLOWED_ORIGINS: list[str] = field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )

    # Server Settings
    FASTAPI_RUN_HOST: str = "0.0.0.0"
    FASTAPI_RUN_PORT: int = 5000

    # Security Settings
    SECRET_KEY: str = ""
    JWT_SECRET_KEY: str = ""
    JWT_COOKIE_SECURE: bool = True
    JWT_COOKIE_SAMESITE: Optional[str] = "Lax"
    CSRF_HEADER_NAME: str = "X-CSRF-TOKEN"
    EMAIL_VERIFY_TOKEN_TTL_HOURS: int = 24

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

    @classmethod
    def from_env(cls) -> "BaseConfig":
        """Create configuration instance from environment variables."""
        default_cors = cls().CORS_ALLOWED_ORIGINS
        return cls(
            BASE_URL=os.getenv("BASE_URL"),
            BASE_URL_1=os.getenv("BASE_URL_1"),
            FRONTEND_VERIFY_SUCCESS_URL=os.getenv(
                "FRONTEND_VERIFY_SUCCESS_URL", cls.FRONTEND_VERIFY_SUCCESS_URL
            ),
            FRONTEND_VERIFY_FAILURE_URL=os.getenv(
                "FRONTEND_VERIFY_FAILURE_URL", cls.FRONTEND_VERIFY_FAILURE_URL
            ),
            FASTAPI_RUN_HOST=os.getenv("FASTAPI_RUN_HOST", "0.0.0.0"),
            FASTAPI_RUN_PORT=int(os.getenv("FASTAPI_RUN_PORT", "5000")),
            SECRET_KEY=cls._get_required_env("SECRET_KEY"),
            JWT_SECRET_KEY=cls._get_required_env("JWT_SECRET_KEY"),
            JWT_COOKIE_SECURE=cls._to_bool(os.getenv("JWT_COOKIE_SECURE"), cls.JWT_COOKIE_SECURE),
            JWT_COOKIE_SAMESITE=os.getenv("JWT_COOKIE_SAMESITE", cls.JWT_COOKIE_SAMESITE),
            CSRF_HEADER_NAME=os.getenv("CSRF_HEADER_NAME", cls.CSRF_HEADER_NAME),
            EMAIL_VERIFY_TOKEN_TTL_HOURS=int(
                os.getenv("EMAIL_VERIFY_TOKEN_TTL_HOURS", str(cls.EMAIL_VERIFY_TOKEN_TTL_HOURS))
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
    env = os.getenv("FASTAPI_ENV", "testing").lower()
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
