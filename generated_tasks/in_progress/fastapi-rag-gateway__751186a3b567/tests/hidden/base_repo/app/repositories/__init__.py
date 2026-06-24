"""Data-access layer.

Repositories encapsulate persistence concerns so the service layer can
be unit-tested with simple in-memory fakes. Each repository exposes a
typed CRUD-ish interface that is awaitable on top of an
:class:`AsyncSession`.
"""

from __future__ import annotations

from app.repositories.api_key import ApiKeyRepository
from app.repositories.audit_log import AuditLogRepository
from app.repositories.base import BaseRepository
from app.repositories.chunk import ChunkRepository
from app.repositories.conversation import ConversationRepository
from app.repositories.document import DocumentRepository
from app.repositories.ingestion_job import IngestionJobRepository
from app.repositories.message import MessageRepository
from app.repositories.user import UserRepository

__all__ = [
    "ApiKeyRepository",
    "AuditLogRepository",
    "BaseRepository",
    "ChunkRepository",
    "ConversationRepository",
    "DocumentRepository",
    "IngestionJobRepository",
    "MessageRepository",
    "UserRepository",
]
