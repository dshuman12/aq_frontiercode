"""Pluggable vector stores."""

from __future__ import annotations

from app.core.config import Settings, get_settings
from app.core.exceptions import ConfigurationError
from app.rag.vectorstores.base import (
    BaseVectorStore,
    VectorStore,
    VectorStoreItem,
    VectorStoreQueryResult,
)
from app.rag.vectorstores.chroma import ChromaVectorStore
from app.rag.vectorstores.faiss import FaissVectorStore
from app.rag.vectorstores.memory import InMemoryVectorStore
from app.rag.vectorstores.pgvector import PgVectorStore
from app.rag.vectorstores.pinecone import PineconeVectorStore
from app.rag.vectorstores.qdrant import QdrantVectorStore


def get_vector_store(settings: Settings | None = None) -> BaseVectorStore:
    settings = settings or get_settings()
    name = settings.vector_store
    if name == "chroma":
        return ChromaVectorStore(settings=settings)
    if name == "faiss":
        return FaissVectorStore(settings=settings)
    if name == "qdrant":
        return QdrantVectorStore(settings=settings)
    if name == "pinecone":
        return PineconeVectorStore(settings=settings)
    if name == "pgvector":
        return PgVectorStore(settings=settings)
    if name == "memory":
        return InMemoryVectorStore(settings=settings)
    raise ConfigurationError(f"Unknown vector store: {name!r}")


__all__ = [
    "BaseVectorStore",
    "ChromaVectorStore",
    "FaissVectorStore",
    "InMemoryVectorStore",
    "PgVectorStore",
    "PineconeVectorStore",
    "QdrantVectorStore",
    "VectorStore",
    "VectorStoreItem",
    "VectorStoreQueryResult",
    "get_vector_store",
]
