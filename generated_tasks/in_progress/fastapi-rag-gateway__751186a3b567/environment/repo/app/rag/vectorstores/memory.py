"""In-memory vector store — useful for tests and ephemeral demos."""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass, field

from app.rag.vectorstores.base import (
    BaseVectorStore,
    VectorStoreItem,
    VectorStoreQueryResult,
)


@dataclass(slots=True)
class _StoredItem:
    text: str
    embedding: list[float]
    metadata: dict[str, object] = field(default_factory=dict)


class InMemoryVectorStore(BaseVectorStore):
    """Plain Python list backed cosine-similarity store."""

    name = "memory"

    def __init__(self, *, settings=None) -> None:
        super().__init__(settings=settings)
        self._items: dict[str, _StoredItem] = {}

    def upsert(self, items: Sequence[VectorStoreItem]) -> None:
        for item in items:
            self._items[item.id] = _StoredItem(
                text=item.text,
                embedding=list(item.embedding),
                metadata=dict(item.metadata),
            )

    def delete(self, ids: Sequence[str]) -> None:
        for identifier in ids:
            self._items.pop(identifier, None)

    def query(
        self,
        embedding: Sequence[float],
        *,
        top_k: int = 4,
        filter: dict[str, object] | None = None,
    ) -> list[VectorStoreQueryResult]:
        if not self._items:
            return []
        scored: list[tuple[float, str, _StoredItem]] = []
        for identifier, stored in self._items.items():
            if filter and not _matches(stored.metadata, filter):
                continue
            score = _cosine(embedding, stored.embedding)
            scored.append((score, identifier, stored))
        scored.sort(key=lambda entry: entry[0], reverse=True)
        out: list[VectorStoreQueryResult] = []
        for score, identifier, stored in scored[:top_k]:
            out.append(
                VectorStoreQueryResult(
                    id=identifier,
                    text=stored.text,
                    score=score,
                    metadata=dict(stored.metadata),
                    embedding=list(stored.embedding),
                )
            )
        return out

    def count(self) -> int:
        return len(self._items)

    def reset(self) -> None:
        self._items.clear()


def _cosine(a: Sequence[float], b: Sequence[float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if not norm_a or not norm_b:
        return 0.0
    return dot / (norm_a * norm_b)


def _matches(metadata: dict[str, object], filter: dict[str, object]) -> bool:
    for key, expected in filter.items():
        if metadata.get(key) != expected:
            return False
    return True


__all__ = ["InMemoryVectorStore"]
