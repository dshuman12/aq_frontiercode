"""Pydantic schemas used by the HTTP API.

The schemas defined here are deliberately decoupled from the ORM
models — they describe the *wire format* of requests and responses
and may diverge from the persistence schema as the API evolves.
"""

from __future__ import annotations

from app.schemas.api_key import (
    ApiKeyCreate,
    ApiKeyCreateResponse,
    ApiKeyOut,
    ApiKeyUpdate,
)
from app.schemas.auth import (
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.chat import (
    ChatChoice,
    ChatCitation,
    ChatRequest,
    ChatResponse,
    ChatStreamChunk,
)
from app.schemas.common import (
    ErrorResponse,
    HealthCheckItem,
    HealthStatus,
    PageEnvelope,
    StatusResponse,
)
from app.schemas.conversation import (
    ConversationCreate,
    ConversationOut,
    ConversationUpdate,
    MessageOut,
)
from app.schemas.document import (
    DocumentCreate,
    DocumentOut,
    DocumentUpdate,
    IngestionJobOut,
)
from app.schemas.search import (
    RetrievedChunk,
    SearchRequest,
    SearchResponse,
)
from app.schemas.user import UserCreate, UserOut, UserUpdate

__all__ = [
    "ApiKeyCreate",
    "ApiKeyCreateResponse",
    "ApiKeyOut",
    "ApiKeyUpdate",
    "ChatChoice",
    "ChatCitation",
    "ChatRequest",
    "ChatResponse",
    "ChatStreamChunk",
    "ConversationCreate",
    "ConversationOut",
    "ConversationUpdate",
    "DocumentCreate",
    "DocumentOut",
    "DocumentUpdate",
    "ErrorResponse",
    "HealthCheckItem",
    "HealthStatus",
    "IngestionJobOut",
    "LoginRequest",
    "MessageOut",
    "PageEnvelope",
    "PasswordResetConfirm",
    "PasswordResetRequest",
    "RefreshRequest",
    "RegisterRequest",
    "RetrievedChunk",
    "SearchRequest",
    "SearchResponse",
    "StatusResponse",
    "TokenResponse",
    "UserCreate",
    "UserOut",
    "UserUpdate",
]
