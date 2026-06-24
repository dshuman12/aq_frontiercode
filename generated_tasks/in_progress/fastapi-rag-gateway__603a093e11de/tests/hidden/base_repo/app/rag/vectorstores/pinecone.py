"""Pinecone vector store backend."""

from __future__ import annotations

from collections.abc import Sequence

from app.core.exceptions import ConfigurationError, ExternalServiceError
from app.rag.vectorstores.base import (
    BaseVectorStore,
    VectorStoreItem,
    VectorStoreQueryResult,
)

try:  # pragma: no cover - optional
    from pinecone import Pinecone
except Exception:  # pragma: no cover
    Pinecone = None  # type: ignore[assignment]


class PineconeVectorStore(BaseVectorStore):
    name = "pinecone"

    def __init__(self, *, settings=None, index=None) -> None:
        super().__init__(settings=settings)
        self._index_override = index
        self._index = None

    def _resolve_index(self):  # pragma: no cover - integration
        if self._index_override is not None:
            return self._index_override
        if self._index is not None:
            return self._index
        if Pinecone is None:
            raise ConfigurationError(
                "Install the 'pinecone' package to use the Pinecone vector store."
            )
        api_key = self.settings.secret("pinecone_api_key")
        if not api_key:
            raise ConfigurationError("PINECONE_API_KEY is not configured.")
        client = Pinecone(api_key=api_key)
        try:
            self._index = client.Index(self.settings.pinecone_index)
        except Exception as exc:
            raise ExternalServiceError(
                f"Failed to access Pinecone index {self.settings.pinecone_index!r}",
                cause=exc,
            ) from exc
        return self._index

    def upsert(self, items: Sequence[VectorStoreItem]) -> None:  # pragma: no cover - integration
        if not items:
            return
        index = self._resolve_index()
        vectors = [
            {
                "id": item.id,
                "values": list(item.embedding),
                "metadata": {"text": item.text, **item.metadata},
            }
            for item in items
        ]
        index.upsert(vectors=vectors)

    def delete(self, ids: Sequence[str]) -> None:  # pragma: no cover - integration
        if not ids:
            return
        self._resolve_index().delete(ids=list(ids))

    def query(
        self,
        embedding: Sequence[float],
        *,
        top_k: int = 4,
        filter: dict[str, object] | None = None,
    ) -> list[VectorStoreQueryResult]:  # pragma: no cover - integration
        index = self._resolve_index()
        response = index.query(
            vector=list(embedding),
            top_k=top_k,
            include_metadata=True,
            filter=filter,
        )
        out: list[VectorStoreQueryResult] = []
        for match in response.matches:
            metadata = dict(match.metadata or {})
            text = metadata.pop("text", "")
            out.append(
                VectorStoreQueryResult(
                    id=str(match.id),
                    text=text,
                    score=float(match.score or 0.0),
                    metadata=metadata,
                )
            )
        return out

    def count(self) -> int:  # pragma: no cover - integration
        index = self._resolve_index()
        stats = index.describe_index_stats()
        return int(stats.total_vector_count or 0)


__all__ = ["PineconeVectorStore"]
