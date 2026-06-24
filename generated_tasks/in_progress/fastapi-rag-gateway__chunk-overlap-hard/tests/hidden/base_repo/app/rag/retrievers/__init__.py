"""Retrieval strategies."""

from __future__ import annotations

from app.core.config import Settings, get_settings
from app.rag.retrievers.base import BaseRetriever, RetrievedItem, Retriever
from app.rag.retrievers.bm25 import BM25Retriever
from app.rag.retrievers.dense import DenseRetriever
from app.rag.retrievers.ensemble import EnsembleRetriever
from app.rag.retrievers.hybrid import HybridRetriever


def get_retriever(
    name: str | None = None,
    *,
    settings: Settings | None = None,
    **kwargs: object,
) -> BaseRetriever:
    settings = settings or get_settings()
    name = (name or "dense").lower()
    if name in {"dense", "vector"}:
        return DenseRetriever(settings=settings, **kwargs)
    if name == "bm25":
        return BM25Retriever(settings=settings, **kwargs)
    if name == "hybrid":
        return HybridRetriever(settings=settings, **kwargs)
    if name == "ensemble":
        return EnsembleRetriever(settings=settings, **kwargs)
    raise ValueError(f"Unknown retriever: {name!r}")


__all__ = [
    "BM25Retriever",
    "BaseRetriever",
    "DenseRetriever",
    "EnsembleRetriever",
    "HybridRetriever",
    "Retriever",
    "RetrievedItem",
    "get_retriever",
]
