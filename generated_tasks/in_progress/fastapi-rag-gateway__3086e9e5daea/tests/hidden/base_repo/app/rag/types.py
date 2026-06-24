"""Lightweight value types used across the RAG package."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class Document:
    """A logical document — possibly a source file before chunking."""

    text: str
    title: str | None = None
    source: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class TextChunk:
    """A retrievable text chunk produced from a :class:`Document`."""

    text: str
    chunk_index: int = 0
    char_start: int | None = None
    char_end: int | None = None
    document_id: str | None = None
    document_title: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class EmbeddingResult:
    """Result of an embedding call."""

    vector: list[float]
    model: str
    token_count: int | None = None


@dataclass(slots=True)
class ChatTurn:
    """A single message exchanged with the language model."""

    role: str
    content: str
    name: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class GenerationUsage:
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


@dataclass(slots=True)
class GenerationOutput:
    """Result of a non-streaming LLM call."""

    text: str
    model: str
    finish_reason: str | None = None
    usage: GenerationUsage | None = None
    raw: dict[str, Any] | None = None


@dataclass(slots=True)
class StreamChunk:
    """A partial token / event emitted during streaming generation."""

    delta: str = ""
    finish_reason: str | None = None
    is_final: bool = False
    raw: dict[str, Any] | None = None


__all__ = [
    "Document",
    "TextChunk",
    "EmbeddingResult",
    "ChatTurn",
    "GenerationOutput",
    "GenerationUsage",
    "StreamChunk",
]
