"""ORM models.

Importing this package registers every model class with the
:class:`Base` metadata, which is required for Alembic to detect
schemas. Submodules are kept small (one model per file) to make code
review and PR diffs easier.
"""

from __future__ import annotations

from app.models.api_key import ApiKey
from app.models.audit_log import AuditLog
from app.models.chunk import Chunk
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.ingestion_job import IngestionJob
from app.models.message import Message
from app.models.rate_limit import RateLimitBucket
from app.models.user import User

__all__ = [
    "ApiKey",
    "AuditLog",
    "Chunk",
    "Conversation",
    "Document",
    "IngestionJob",
    "Message",
    "RateLimitBucket",
    "User",
]
