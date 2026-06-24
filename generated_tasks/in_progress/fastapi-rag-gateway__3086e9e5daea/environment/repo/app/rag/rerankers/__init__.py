"""Cross-encoder rerankers."""

from __future__ import annotations

from app.core.config import Settings, get_settings
from app.rag.rerankers.base import BaseReranker, Reranker
from app.rag.rerankers.cohere import CohereReranker
from app.rag.rerankers.cross_encoder import CrossEncoderReranker
from app.rag.rerankers.identity import IdentityReranker


def get_reranker(name: str | None = None, *, settings: Settings | None = None) -> BaseReranker:
    settings = settings or get_settings()
    if not name or name == "identity":
        return IdentityReranker(settings=settings)
    if name == "cross_encoder":
        return CrossEncoderReranker(settings=settings)
    if name == "cohere":
        return CohereReranker(settings=settings)
    raise ValueError(f"Unknown reranker: {name!r}")


__all__ = [
    "BaseReranker",
    "CohereReranker",
    "CrossEncoderReranker",
    "IdentityReranker",
    "Reranker",
    "get_reranker",
]
