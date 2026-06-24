"""Chat / generation schemas."""

from __future__ import annotations

from pydantic import Field, field_validator

from app.core.constants import (
    DEFAULT_RETRIEVAL_K,
    MAX_QUERY_LENGTH,
    MAX_RETRIEVAL_K,
)
from app.schemas.common import BaseSchema


class ChatRequest(BaseSchema):
    message: str = Field(min_length=1, max_length=MAX_QUERY_LENGTH)
    conversation_id: str | None = None
    system_prompt: str | None = Field(default=None, max_length=4000)
    model: str | None = None
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)
    max_tokens: int | None = Field(default=None, ge=1, le=8000)
    top_k: int = Field(default=DEFAULT_RETRIEVAL_K, ge=1, le=MAX_RETRIEVAL_K)
    use_history: bool = True
    stream: bool = False
    metadata: dict = Field(default_factory=dict)

    @field_validator("message")
    @classmethod
    def _strip_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("message must not be blank")
        return cleaned


class ChatCitation(BaseSchema):
    chunk_id: str | None = None
    document_id: str | None = None
    title: str | None = None
    snippet: str | None = None
    score: float | None = None
    metadata: dict = Field(default_factory=dict)


class ChatChoice(BaseSchema):
    role: str = "assistant"
    content: str
    finish_reason: str | None = None


class ChatResponse(BaseSchema):
    conversation_id: str
    message_id: str
    answer: str
    choices: list[ChatChoice] = Field(default_factory=list)
    citations: list[ChatCitation] = Field(default_factory=list)
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    latency_ms: float | None = None
    metadata: dict = Field(default_factory=dict)


class ChatStreamChunk(BaseSchema):
    conversation_id: str
    message_id: str
    delta: str = ""
    role: str = "assistant"
    is_final: bool = False
    finish_reason: str | None = None
    citations: list[ChatCitation] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


__all__ = [
    "ChatCitation",
    "ChatChoice",
    "ChatRequest",
    "ChatResponse",
    "ChatStreamChunk",
]
