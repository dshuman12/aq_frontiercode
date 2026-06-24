"""Application configuration.

Configuration is loaded from environment variables (and a ``.env`` file
in development) using :class:`pydantic_settings.BaseSettings`. The
:func:`get_settings` accessor is wrapped in :func:`functools.lru_cache`
so that the resolved settings object is treated as a singleton during
the process lifetime, while still being easy to override in tests via
``Settings.override``.

The module deliberately avoids importing heavyweight dependencies so
that ``from app.core.config import get_settings`` is cheap.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

try:  # pragma: no cover - optional dependency
    from pydantic import AnyHttpUrl, Field, SecretStr, field_validator
    from pydantic_settings import BaseSettings, SettingsConfigDict
except Exception:  # pragma: no cover - graceful degradation
    BaseSettings = object  # type: ignore[assignment, misc]
    SettingsConfigDict = dict  # type: ignore[assignment, misc]
    SecretStr = str  # type: ignore[assignment, misc]
    AnyHttpUrl = str  # type: ignore[assignment, misc]

    def Field(default: Any = None, **_: Any) -> Any:  # type: ignore[no-redef]
        return default

    def field_validator(*_: Any, **__: Any):  # type: ignore[no-redef]
        def decorator(fn: Any) -> Any:
            return fn

        return decorator


Environment = Literal["development", "staging", "production", "test"]
LogFormat = Literal["json", "console"]
LLMProviderName = Literal[
    "openai",
    "openrouter",
    "anthropic",
    "ollama",
    "mock",
]
EmbeddingProviderName = Literal[
    "openai",
    "huggingface",
    "sentence_transformers",
    "mock",
]
VectorStoreName = Literal[
    "chroma",
    "faiss",
    "qdrant",
    "pinecone",
    "pgvector",
    "memory",
]


_REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):  # type: ignore[misc]
    """Strongly-typed application settings.

    Settings are organised into logical groups separated by blank lines
    and comment headers so that the schema doubles as documentation.
    """

    model_config = SettingsConfigDict(  # type: ignore[call-arg]
        env_file=str(_REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        env_prefix="",
        case_sensitive=False,
        extra="ignore",
    )

    # ----- Application metadata ------------------------------------------------
    app_name: str = Field(default="FastAPI RAG Gateway")
    app_version: str = Field(default="1.0.0")
    environment: Environment = Field(default="development")
    debug: bool = Field(default=False)
    testing: bool = Field(default=False)

    # ----- HTTP server ---------------------------------------------------------
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    workers: int = Field(default=1)
    reload: bool = Field(default=False)
    api_prefix: str = Field(default="/api/v1")
    docs_url: str | None = Field(default="/docs")
    redoc_url: str | None = Field(default="/redoc")
    openapi_url: str | None = Field(default="/openapi.json")
    root_path: str = Field(default="")

    # ----- CORS ----------------------------------------------------------------
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])
    cors_allow_credentials: bool = Field(default=True)
    cors_allow_methods: list[str] = Field(default_factory=lambda: ["*"])
    cors_allow_headers: list[str] = Field(default_factory=lambda: ["*"])

    # ----- Security ------------------------------------------------------------
    secret_key: SecretStr = Field(default=SecretStr("change-me-in-production"))
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60)
    refresh_token_expire_days: int = Field(default=14)
    password_reset_expire_minutes: int = Field(default=30)
    email_verification_expire_hours: int = Field(default=48)
    api_key_prefix: str = Field(default="rgw")

    # ----- Database ------------------------------------------------------------
    database_url: str = Field(default="sqlite+aiosqlite:///./rag_gateway.db")
    database_pool_size: int = Field(default=10)
    database_max_overflow: int = Field(default=20)
    database_pool_recycle_seconds: int = Field(default=1800)
    database_echo: bool = Field(default=False)

    # ----- Cache / Redis -------------------------------------------------------
    redis_url: str | None = Field(default=None)
    redis_default_ttl_seconds: int = Field(default=300)
    cache_enabled: bool = Field(default=True)

    # ----- Rate limiting -------------------------------------------------------
    rate_limit_enabled: bool = Field(default=True)
    rate_limit_per_minute: int = Field(default=120)
    rate_limit_burst: int = Field(default=30)
    rate_limit_anonymous_per_minute: int = Field(default=30)

    # ----- LLM ----------------------------------------------------------------
    llm_provider: LLMProviderName = Field(default="openrouter")
    llm_model: str = Field(default="deepseek/deepseek-chat")
    llm_base_url: AnyHttpUrl | None = Field(default="https://openrouter.ai/api/v1")
    llm_temperature: float = Field(default=0.0)
    llm_max_tokens: int = Field(default=1024)
    llm_timeout_seconds: float = Field(default=60.0)
    llm_streaming_enabled: bool = Field(default=True)

    openai_api_key: SecretStr | None = Field(default=None)
    openrouter_api_key: SecretStr | None = Field(default=None)
    anthropic_api_key: SecretStr | None = Field(default=None)
    ollama_base_url: AnyHttpUrl | None = Field(default="http://localhost:11434")

    # ----- Embeddings ---------------------------------------------------------
    embedding_provider: EmbeddingProviderName = Field(default="openai")
    embedding_model: str = Field(default="text-embedding-3-small")
    embedding_dimensions: int = Field(default=1536)
    embedding_batch_size: int = Field(default=64)
    embedding_timeout_seconds: float = Field(default=30.0)

    # ----- Vector stores ------------------------------------------------------
    vector_store: VectorStoreName = Field(default="chroma")
    chroma_persist_dir: str = Field(default="chroma_store")
    chroma_collection: str = Field(default="documents")
    faiss_index_dir: str = Field(default="faiss_store")
    qdrant_url: AnyHttpUrl | None = Field(default=None)
    qdrant_api_key: SecretStr | None = Field(default=None)
    qdrant_collection: str = Field(default="documents")
    pinecone_api_key: SecretStr | None = Field(default=None)
    pinecone_environment: str | None = Field(default=None)
    pinecone_index: str = Field(default="documents")
    pgvector_dsn: str | None = Field(default=None)

    # ----- Retrieval ----------------------------------------------------------
    retrieval_k: int = Field(default=4)
    retrieval_fetch_k: int = Field(default=20)
    retrieval_score_threshold: float = Field(default=0.0)
    retrieval_hybrid_alpha: float = Field(default=0.5)
    retriever: str = Field(default="dense")
    reranker: str = Field(default="identity")
    rerank_enabled: bool = Field(default=False)
    rerank_model: str = Field(default="cross-encoder/ms-marco-MiniLM-L-6-v2")
    rerank_top_k: int = Field(default=8)
    cohere_api_key: SecretStr | None = Field(default=None)
    huggingface_api_key: SecretStr | None = Field(default=None)

    # ----- Memory -------------------------------------------------------------
    memory_kind: str = Field(default="window")
    memory_window_size: int = Field(default=8)

    # ----- Chunking -----------------------------------------------------------
    chunk_size: int = Field(default=512)
    chunk_overlap: int = Field(default=64)
    chunker: str = Field(default="recursive")

    # ----- Storage ------------------------------------------------------------
    data_dir: str = Field(default="data")
    upload_dir: str = Field(default="uploads")
    artifact_dir: str = Field(default="artifacts")
    max_upload_bytes: int = Field(default=25 * 1024 * 1024)

    # ----- Workers ------------------------------------------------------------
    celery_broker_url: str | None = Field(default=None)
    celery_result_backend: str | None = Field(default=None)
    celery_task_default_queue: str = Field(default="default")
    celery_task_serializer: str = Field(default="json")
    celery_eager: bool = Field(default=False)

    # ----- Observability ------------------------------------------------------
    log_level: str = Field(default="INFO")
    log_format: LogFormat = Field(default="console")
    metrics_enabled: bool = Field(default=True)
    metrics_path: str = Field(default="/metrics")
    tracing_enabled: bool = Field(default=False)
    tracing_endpoint: AnyHttpUrl | None = Field(default=None)
    tracing_sample_rate: float = Field(default=0.1)
    sentry_dsn: SecretStr | None = Field(default=None)
    sentry_environment: str | None = Field(default=None)
    sentry_traces_sample_rate: float = Field(default=0.0)

    # ----- Feature flags ------------------------------------------------------
    feature_streaming: bool = Field(default=True)
    feature_conversations: bool = Field(default=True)
    feature_admin_api: bool = Field(default=True)
    feature_eval_api: bool = Field(default=False)
    feature_telemetry: bool = Field(default=True)

    # ----- Admin --------------------------------------------------------------
    admin_emails: list[str] = Field(default_factory=list)
    superuser_email: str | None = Field(default=None)
    superuser_password: SecretStr | None = Field(default=None)

    # ----- Misc ---------------------------------------------------------------
    request_timeout_seconds: float = Field(default=30.0)
    max_concurrent_requests: int = Field(default=100)
    backend_id: str | None = Field(default=None)

    # ------------------------------------------------------------------
    # Validators
    # ------------------------------------------------------------------

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: Any) -> Any:
        return _split_list(value)

    @field_validator("cors_allow_methods", mode="before")
    @classmethod
    def _split_cors_methods(cls, value: Any) -> Any:
        return _split_list(value)

    @field_validator("cors_allow_headers", mode="before")
    @classmethod
    def _split_cors_headers(cls, value: Any) -> Any:
        return _split_list(value)

    @field_validator("admin_emails", mode="before")
    @classmethod
    def _split_admin_emails(cls, value: Any) -> Any:
        return _split_list(value)

    @field_validator("environment", mode="before")
    @classmethod
    def _normalise_env(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("log_level", mode="before")
    @classmethod
    def _normalise_log_level(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().upper()
        return value

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def is_test(self) -> bool:
        return self.environment == "test" or self.testing

    @property
    def cache_url(self) -> str | None:
        return self.redis_url

    def secret(self, name: str) -> str | None:
        """Return the plain value of a ``SecretStr`` field if set."""

        value = getattr(self, name, None)
        if value is None:
            return None
        if isinstance(value, SecretStr):  # pragma: no branch
            return value.get_secret_value()
        return str(value)

    def mask_secret(self, name: str) -> str | None:
        """Return a redacted representation of a secret field."""

        plain = self.secret(name)
        if not plain:
            return None
        if len(plain) <= 8:
            return "***"
        return f"{plain[:4]}…{plain[-4:]}"

    def model_dump_safe(self) -> dict[str, Any]:
        """Dump settings while masking known secret fields."""

        data = self.model_dump()
        for name, value in list(data.items()):
            if isinstance(getattr(self, name, None), SecretStr):
                data[name] = self.mask_secret(name)
        return data

    def resolve_path(self, value: str) -> Path:
        """Resolve a possibly-relative path against the repo root."""

        path = Path(value)
        if not path.is_absolute():
            path = _REPO_ROOT / path
        return path


def _split_list(value: Any) -> Any:
    """Allow list settings to be provided as JSON or comma-separated text."""

    if value is None or isinstance(value, list):
        return value
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return []
        if stripped.startswith("["):
            try:
                return json.loads(stripped)
            except json.JSONDecodeError:
                pass
        return [item.strip() for item in stripped.split(",") if item.strip()]
    return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide :class:`Settings` instance."""

    return Settings()  # type: ignore[call-arg]


def reload_settings() -> Settings:
    """Reset the cached settings instance — primarily used in tests."""

    get_settings.cache_clear()
    return get_settings()


def env(name: str, default: str | None = None) -> str | None:
    """Compatibility helper for legacy ``os.getenv`` style lookups."""

    return os.environ.get(name, default)


__all__ = [
    "Environment",
    "LogFormat",
    "LLMProviderName",
    "EmbeddingProviderName",
    "VectorStoreName",
    "Settings",
    "get_settings",
    "reload_settings",
    "env",
]
