"""Project-wide constants.

Constants live here (rather than being scattered across modules) so
they can be referenced from any layer without creating circular
imports. Anything that is environment-driven belongs in
:mod:`app.core.config` instead.
"""

from __future__ import annotations

from typing import Final

APP_NAME: Final[str] = "FastAPI RAG Gateway"
APP_SLUG: Final[str] = "rag-gateway"
APP_VENDOR: Final[str] = "Devaansh Kathuria"
APP_DESCRIPTION: Final[str] = (
    "Production-grade Retrieval-Augmented Generation gateway built on FastAPI."
)

DEFAULT_API_PREFIX: Final[str] = "/api/v1"
DEFAULT_TIMEZONE: Final[str] = "UTC"
DEFAULT_LOCALE: Final[str] = "en_US"
DEFAULT_PAGE_SIZE: Final[int] = 25
MAX_PAGE_SIZE: Final[int] = 200
DEFAULT_REQUEST_TIMEOUT_SECONDS: Final[float] = 30.0
DEFAULT_LLM_TIMEOUT_SECONDS: Final[float] = 60.0
DEFAULT_EMBEDDING_TIMEOUT_SECONDS: Final[float] = 30.0

DEFAULT_CHUNK_SIZE: Final[int] = 512
DEFAULT_CHUNK_OVERLAP: Final[int] = 64
MAX_CHUNK_SIZE: Final[int] = 4096
MAX_DOCUMENT_BYTES: Final[int] = 25 * 1024 * 1024
MAX_QUERY_LENGTH: Final[int] = 4000
MAX_HISTORY_MESSAGES: Final[int] = 64

DEFAULT_RETRIEVAL_K: Final[int] = 4
MAX_RETRIEVAL_K: Final[int] = 50
DEFAULT_RERANK_K: Final[int] = 8
DEFAULT_HYBRID_ALPHA: Final[float] = 0.5

ACCESS_TOKEN_EXPIRE_MINUTES: Final[int] = 60
REFRESH_TOKEN_EXPIRE_DAYS: Final[int] = 14
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: Final[int] = 30
EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: Final[int] = 48

API_KEY_PREFIX: Final[str] = "rgw"
API_KEY_RANDOM_BYTES: Final[int] = 32
PASSWORD_HASH_ROUNDS: Final[int] = 12
PASSWORD_MIN_LENGTH: Final[int] = 10
PASSWORD_MAX_LENGTH: Final[int] = 128

REQUEST_ID_HEADER: Final[str] = "X-Request-ID"
CORRELATION_ID_HEADER: Final[str] = "X-Correlation-ID"
API_VERSION_HEADER: Final[str] = "X-API-Version"
RATE_LIMIT_HEADER: Final[str] = "X-RateLimit-Limit"
RATE_LIMIT_REMAINING_HEADER: Final[str] = "X-RateLimit-Remaining"
RATE_LIMIT_RESET_HEADER: Final[str] = "X-RateLimit-Reset"
RETRY_AFTER_HEADER: Final[str] = "Retry-After"

SUPPORTED_LANGUAGES: Final[tuple[str, ...]] = (
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "nl",
    "ja",
    "zh",
    "hi",
    "ar",
    "ru",
)

SUPPORTED_DOCUMENT_EXTENSIONS: Final[tuple[str, ...]] = (
    ".txt",
    ".md",
    ".markdown",
    ".rst",
    ".html",
    ".htm",
    ".pdf",
    ".docx",
    ".csv",
    ".json",
    ".yaml",
    ".yml",
)

CACHE_NAMESPACE_EMBEDDINGS: Final[str] = "emb"
CACHE_NAMESPACE_LLM: Final[str] = "llm"
CACHE_NAMESPACE_SEARCH: Final[str] = "search"
CACHE_NAMESPACE_RATE_LIMIT: Final[str] = "rl"
CACHE_NAMESPACE_USER: Final[str] = "user"

ROLE_ADMIN: Final[str] = "admin"
ROLE_USER: Final[str] = "user"
ROLE_SERVICE: Final[str] = "service"
ROLE_READONLY: Final[str] = "readonly"

ALL_ROLES: Final[tuple[str, ...]] = (
    ROLE_ADMIN,
    ROLE_USER,
    ROLE_SERVICE,
    ROLE_READONLY,
)

JOB_STATUS_PENDING: Final[str] = "pending"
JOB_STATUS_RUNNING: Final[str] = "running"
JOB_STATUS_SUCCEEDED: Final[str] = "succeeded"
JOB_STATUS_FAILED: Final[str] = "failed"
JOB_STATUS_CANCELLED: Final[str] = "cancelled"

DEFAULT_EMBEDDING_MODEL: Final[str] = "text-embedding-3-small"
DEFAULT_LLM_MODEL: Final[str] = "deepseek/deepseek-chat"
DEFAULT_VECTORSTORE: Final[str] = "chroma"

PROMETHEUS_NAMESPACE: Final[str] = "rag_gateway"
TRACING_SERVICE_NAME: Final[str] = "rag-gateway"

HTTP_USER_AGENT: Final[str] = f"{APP_SLUG}/1.0"
