"""In-memory vector store tests."""

from __future__ import annotations

from app.rag.vectorstores import VectorStoreItem
from app.rag.vectorstores.memory import InMemoryVectorStore


def _items() -> list[VectorStoreItem]:
    return [
        VectorStoreItem(id="1", text="cats are great", embedding=[1.0, 0.0, 0.0], metadata={}),
        VectorStoreItem(id="2", text="dogs are loyal", embedding=[0.0, 1.0, 0.0], metadata={}),
        VectorStoreItem(id="3", text="birds can fly", embedding=[0.0, 0.0, 1.0], metadata={}),
    ]


def test_upsert_and_query() -> None:
    store = InMemoryVectorStore()
    store.upsert(_items())
    results = store.query([1.0, 0.0, 0.0], top_k=2)
    assert results
    assert results[0].id == "1"


def test_delete_removes_items() -> None:
    store = InMemoryVectorStore()
    store.upsert(_items())
    assert store.count() == 3
    store.delete(["1", "2"])
    assert store.count() == 1
