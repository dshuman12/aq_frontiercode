"""Retriever tests."""

from __future__ import annotations

from app.core.config import Settings
from app.rag.embeddings.mock import MockEmbeddingProvider
from app.rag.retrievers.bm25 import BM25Document, BM25Retriever
from app.rag.retrievers.dense import DenseRetriever
from app.rag.vectorstores import VectorStoreItem
from app.rag.vectorstores.memory import InMemoryVectorStore


def test_bm25_returns_relevant_results() -> None:
    docs = [
        BM25Document(id="1", text="The quick brown fox jumps"),
        BM25Document(id="2", text="Lazy dogs sleep through the night"),
        BM25Document(id="3", text="Cats are independent and curious"),
    ]
    retriever = BM25Retriever(settings=Settings(), documents=docs)
    results = retriever.retrieve("cats curious", top_k=2)
    assert results
    assert results[0].id == "3"


def test_dense_retriever_uses_vector_store() -> None:
    settings = Settings()
    embedder = MockEmbeddingProvider(settings=settings)
    store = InMemoryVectorStore(settings=settings)
    items = []
    for index, text in enumerate(
        [
            "I love my pet cat",
            "Dogs are loyal companions",
            "Birds can fly long distances",
        ]
    ):
        embedding = embedder.embed(text).vector
        items.append(VectorStoreItem(id=str(index), text=text, embedding=embedding, metadata={}))
    store.upsert(items)
    retriever = DenseRetriever(settings=settings, embedder=embedder, vector_store=store)
    results = retriever.retrieve("pet cat", top_k=2)
    assert len(results) == 2
    assert all(item.score >= -1.0 for item in results)
