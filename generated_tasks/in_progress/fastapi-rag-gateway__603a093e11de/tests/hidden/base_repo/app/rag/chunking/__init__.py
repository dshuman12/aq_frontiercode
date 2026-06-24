"""Pluggable text-chunking strategies.

A *chunker* takes a :class:`~app.rag.types.Document` and produces an
ordered list of :class:`~app.rag.types.TextChunk` objects suitable for
embedding and retrieval. The :func:`get_chunker` factory selects a
concrete implementation based on configuration; users may also instantiate
chunkers directly when they need bespoke parameters.
"""

from __future__ import annotations

from app.rag.chunking.base import BaseChunker, ChunkOptions
from app.rag.chunking.fixed import FixedChunker
from app.rag.chunking.recursive import RecursiveCharacterChunker
from app.rag.chunking.semantic import SemanticChunker
from app.rag.chunking.sentence import SentenceChunker
from app.rag.chunking.token import TokenChunker
from app.rag.types import TextChunk as Chunk


def get_chunker(name: str | None = None, **kwargs: object) -> BaseChunker:
    """Return a chunker instance by name."""

    name = (name or "recursive").lower()
    options = ChunkOptions.from_kwargs(kwargs)
    if name in {"recursive", "default", "auto"}:
        return RecursiveCharacterChunker(options)
    if name in {"fixed", "character"}:
        return FixedChunker(options)
    if name == "sentence":
        return SentenceChunker(options)
    if name == "semantic":
        return SemanticChunker(options)
    if name == "token":
        return TokenChunker(options)
    raise ValueError(f"Unknown chunker: {name!r}")


__all__ = [
    "BaseChunker",
    "Chunk",
    "ChunkOptions",
    "FixedChunker",
    "RecursiveCharacterChunker",
    "SemanticChunker",
    "SentenceChunker",
    "TokenChunker",
    "get_chunker",
]
