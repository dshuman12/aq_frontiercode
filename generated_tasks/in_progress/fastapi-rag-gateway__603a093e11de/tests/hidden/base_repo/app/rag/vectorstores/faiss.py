"""FAISS-backed vector store with on-disk persistence."""

from __future__ import annotations

import json
from collections.abc import Sequence
from pathlib import Path

from app.core.exceptions import ConfigurationError
from app.rag.vectorstores.base import (
    BaseVectorStore,
    VectorStoreItem,
    VectorStoreQueryResult,
)
from app.rag.vectorstores.memory import InMemoryVectorStore

try:  # pragma: no cover - optional dependency
    import faiss
    import numpy as np
except Exception:  # pragma: no cover - graceful degradation
    faiss = None  # type: ignore[assignment]
    np = None  # type: ignore[assignment]


class FaissVectorStore(BaseVectorStore):
    """Persists FAISS indices alongside a JSON metadata sidecar."""

    name = "faiss"

    def __init__(self, *, settings=None) -> None:
        super().__init__(settings=settings)
        if faiss is None or np is None:
            raise ConfigurationError(
                "Install 'faiss-cpu' and 'numpy' to use the FAISS vector store."
            )
        self._index_dir = Path(self.settings.resolve_path(self.settings.faiss_index_dir))
        self._index_dir.mkdir(parents=True, exist_ok=True)
        self._index = None
        self._items: dict[str, dict] = {}
        self._id_order: list[str] = []
        self._load()

    @property
    def _meta_path(self) -> Path:
        return self._index_dir / "metadata.json"

    @property
    def _index_path(self) -> Path:
        return self._index_dir / "index.faiss"

    def _load(self) -> None:
        if self._index_path.exists():
            self._index = faiss.read_index(str(self._index_path))
        if self._meta_path.exists():
            payload = json.loads(self._meta_path.read_text())
            self._items = payload.get("items", {})
            self._id_order = payload.get("order", [])

    def _persist(self) -> None:
        if self._index is not None:
            faiss.write_index(self._index, str(self._index_path))
        self._meta_path.write_text(json.dumps({"items": self._items, "order": self._id_order}))

    def _ensure_index(self, dim: int):
        if self._index is None:
            self._index = faiss.IndexFlatIP(dim)

    def upsert(self, items: Sequence[VectorStoreItem]) -> None:
        if not items:
            return
        dim = len(items[0].embedding)
        self._ensure_index(dim)
        ids_to_remove = [item.id for item in items if item.id in self._items]
        if ids_to_remove:
            self.delete(ids_to_remove)
        vectors = np.asarray([list(item.embedding) for item in items], dtype="float32")
        faiss.normalize_L2(vectors)
        self._index.add(vectors)
        for item in items:
            self._items[item.id] = {
                "text": item.text,
                "metadata": dict(item.metadata),
            }
            self._id_order.append(item.id)
        self._persist()

    def delete(self, ids: Sequence[str]) -> None:
        if not ids or self._index is None:
            return
        keep_ids = [identifier for identifier in self._id_order if identifier not in set(ids)]
        keep_vectors: list[list[float]] = []
        if keep_ids:
            # Rebuild the index from scratch — FAISS's flat index does
            # not natively support removal by arbitrary key.
            for identifier in keep_ids:
                payload = self._items.get(identifier)
                if payload is None:
                    continue
                keep_vectors.append(payload.get("embedding", []))
        for identifier in ids:
            self._items.pop(identifier, None)
        self._id_order = keep_ids
        if keep_vectors:
            dim = len(keep_vectors[0])
            self._index = faiss.IndexFlatIP(dim)
            vectors = np.asarray(keep_vectors, dtype="float32")
            faiss.normalize_L2(vectors)
            self._index.add(vectors)
        else:
            self._index = None
        self._persist()

    def query(
        self,
        embedding: Sequence[float],
        *,
        top_k: int = 4,
        filter: dict[str, object] | None = None,
    ) -> list[VectorStoreQueryResult]:
        if self._index is None or not self._id_order:
            return []
        vector = np.asarray([list(embedding)], dtype="float32")
        faiss.normalize_L2(vector)
        scores, indices = self._index.search(vector, min(top_k, len(self._id_order)))
        out: list[VectorStoreQueryResult] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self._id_order):
                continue
            identifier = self._id_order[idx]
            payload = self._items.get(identifier)
            if payload is None:
                continue
            metadata = payload.get("metadata", {})
            if filter and not all(metadata.get(k) == v for k, v in filter.items()):
                continue
            out.append(
                VectorStoreQueryResult(
                    id=identifier,
                    text=payload.get("text", ""),
                    score=float(score),
                    metadata=dict(metadata),
                )
            )
        return out

    def count(self) -> int:
        return len(self._items)

    def reset(self) -> None:
        self._index = None
        self._items.clear()
        self._id_order.clear()
        if self._meta_path.exists():
            self._meta_path.unlink()
        if self._index_path.exists():
            self._index_path.unlink()


# When FAISS is missing the import-time raise above already provides a
# clear error; we keep an alias so type-checkers don't complain when the
# module is imported but FAISS is unavailable.
_FallbackVectorStore = InMemoryVectorStore  # noqa: F401


__all__ = ["FaissVectorStore"]
