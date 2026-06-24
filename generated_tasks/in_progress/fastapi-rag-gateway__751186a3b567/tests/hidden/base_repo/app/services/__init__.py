"""Service layer.

Services orchestrate repositories, RAG components and external
integrations to implement the high-level use cases of the gateway.
They contain the business logic and are the only layer that mutates
state — repositories handle persistence, services handle invariants.
"""

from __future__ import annotations

from app.services.analytics import AnalyticsService
from app.services.api_keys import ApiKeyService
from app.services.auth import AuthService, LoginResult
from app.services.chat import ChatService
from app.services.documents import DocumentService
from app.services.ingestion import IngestionService
from app.services.search import SearchService
from app.services.users import UserService

__all__ = [
    "AnalyticsService",
    "ApiKeyService",
    "AuthService",
    "ChatService",
    "DocumentService",
    "IngestionService",
    "LoginResult",
    "SearchService",
    "UserService",
]
