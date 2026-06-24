"""Embedding providers.

Each provider implements :class:`BaseEmbeddingProvider` and exposes a
small ``embed`` / ``aembed`` API. Providers are selected at runtime via
:func:`get_embedding_provider` which reads from
:class:`app.core.config.Settings`.
"""

from __future__ import annotations

from app.core.config import Settings, get_settings
from app.core.exceptions import ConfigurationError
from app.rag.embeddings.base import BaseEmbeddingProvider, EmbeddingProvider
from app.rag.embeddings.huggingface import HuggingFaceEmbeddingProvider
from app.rag.embeddings.mock import MockEmbeddingProvider
from app.rag.embeddings.openai import OpenAIEmbeddingProvider
from app.rag.embeddings.sentence_transformers import (
    SentenceTransformersEmbeddingProvider,
)


def get_embedding_provider(
    settings: Settings | None = None,
) -> BaseEmbeddingProvider:
    """Return the configured embedding provider."""

    settings = settings or get_settings()
    name = settings.embedding_provider
    if name == "openai":
        return OpenAIEmbeddingProvider(settings=settings)
    if name == "huggingface":
        return HuggingFaceEmbeddingProvider(settings=settings)
    if name == "sentence_transformers":
        return SentenceTransformersEmbeddingProvider(settings=settings)
    if name == "mock":
        return MockEmbeddingProvider(settings=settings)
    raise ConfigurationError(f"Unknown embedding provider: {name!r}")


__all__ = [
    "BaseEmbeddingProvider",
    "EmbeddingProvider",
    "HuggingFaceEmbeddingProvider",
    "MockEmbeddingProvider",
    "OpenAIEmbeddingProvider",
    "SentenceTransformersEmbeddingProvider",
    "get_embedding_provider",
]
