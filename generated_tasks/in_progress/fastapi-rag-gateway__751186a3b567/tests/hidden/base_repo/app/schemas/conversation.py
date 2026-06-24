"""Conversation and message schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseSchema, IdentifiableSchema


class MessageOut(IdentifiableSchema):
    conversation_id: str
    role: str
    content: str
    seq: int
    finish_reason: str | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    latency_ms: float | None = None
    model: str | None = None
    citations: list[dict] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class ConversationCreate(BaseSchema):
    title: str | None = Field(default=None, max_length=255)
    metadata: dict = Field(default_factory=dict)


class ConversationUpdate(BaseSchema):
    title: str | None = Field(default=None, max_length=255)
    is_pinned: bool | None = None
    summary: str | None = Field(default=None, max_length=4000)
    metadata: dict | None = None


class ConversationOut(IdentifiableSchema):
    title: str
    summary: str | None = None
    is_pinned: bool
    last_activity_at: datetime | None = None
    message_count: int
    metadata: dict = Field(default_factory=dict)
    messages: list[MessageOut] = Field(default_factory=list)


__all__ = [
    "ConversationCreate",
    "ConversationOut",
    "ConversationUpdate",
    "MessageOut",
]
