"""Reranker tests."""

from __future__ import annotations

from app.core.config import Settings
from app.rag.rerankers.identity import IdentityReranker
from app.rag.retrievers import RetrievedItem


def test_identity_reranker_preserves_order() -> None:
    reranker = IdentityReranker(settings=Settings())
    items = [
        RetrievedItem(id="a", text="alpha", score=0.9, rank=0),
        RetrievedItem(id="b", text="beta", score=0.5, rank=1),
        RetrievedItem(id="c", text="gamma", score=0.3, rank=2),
    ]
    reordered = reranker.rerank("query", items, top_k=2)
    assert [item.id for item in reordered] == ["a", "b"]
