"""Embedding provider tests."""

from __future__ import annotations

from app.core.config import Settings
from app.rag.embeddings.mock import MockEmbeddingProvider


def test_mock_embeddings_are_deterministic() -> None:
    provider = MockEmbeddingProvider(settings=Settings())
    a = provider.embed("hello")
    b = provider.embed("hello")
    assert a.vector == b.vector


def test_mock_embeddings_have_correct_dimension() -> None:
    settings = Settings()
    provider = MockEmbeddingProvider(settings=settings)
    a = provider.embed("hello")
    assert len(a.vector) == settings.embedding_dimensions
