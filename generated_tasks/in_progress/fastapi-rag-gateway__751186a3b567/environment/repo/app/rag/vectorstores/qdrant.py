"""Qdrant vector store backend (HTTP)."""

from __future__ import annotations

from collections.abc import Sequence

from app.core.exceptions import ConfigurationError, ExternalServiceError
from app.rag.vectorstores.base import (
    BaseVectorStore,
    VectorStoreItem,
    VectorStoreQueryResult,
)

try:  # pragma: no cover - optional
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qmodels
except Exception:  # pragma: no cover
    QdrantClient = None  # type: ignore[assignment]
    qmodels = None  # type: ignore[assignment]


class QdrantVectorStore(BaseVectorStore):
    name = "qdrant"

    def __init__(self, *, settings=None, client=None) -> None:
        super().__init__(settings=settings)
        self._client_override = client
        self._client = None

    def _resolve_client(self):
        if self._client_override is not None:
            return self._client_override
        if self._client is not None:
            return self._client
        if QdrantClient is None:
            raise ConfigurationError("Install 'qdrant-client' to use the Qdrant vector store.")
        if not self.settings.qdrant_url:
            raise ConfigurationError("QDRANT_URL is not configured.")
        try:
            self._client = QdrantClient(
                url=str(self.settings.qdrant_url),
                api_key=self.settings.secret("qdrant_api_key"),
            )
        except Exception as exc:  # pragma: no cover - network behaviour
            raise ExternalServiceError("Failed to initialise Qdrant client.", cause=exc) from exc
        return self._client

    def _ensure_collection(self, dim: int) -> None:  # pragma: no cover - integration
        client = self._resolve_client()
        collections = {c.name for c in client.get_collections().collections}
        if self.settings.qdrant_collection in collections:
            return
        client.create_collection(
            collection_name=self.settings.qdrant_collection,
            vectors_config=qmodels.VectorParams(size=dim, distance=qmodels.Distance.COSINE),
        )

    def upsert(self, items: Sequence[VectorStoreItem]) -> None:  # pragma: no cover - integration
        if not items:
            return
        client = self._resolve_client()
        self._ensure_collection(len(items[0].embedding))
        points = [
            qmodels.PointStruct(
                id=item.id,
                vector=list(item.embedding),
                payload={"text": item.text, **item.metadata},
            )
            for item in items
        ]
        client.upsert(collection_name=self.settings.qdrant_collection, points=points)

    def delete(self, ids: Sequence[str]) -> None:  # pragma: no cover - integration
        if not ids:
            return
        client = self._resolve_client()
        client.delete(
            collection_name=self.settings.qdrant_collection,
            points_selector=qmodels.PointIdsList(points=list(ids)),
        )

    def query(
        self,
        embedding: Sequence[float],
        *,
        top_k: int = 4,
        filter: dict[str, object] | None = None,
    ) -> list[VectorStoreQueryResult]:  # pragma: no cover - integration
        client = self._resolve_client()
        try:
            response = client.search(
                collection_name=self.settings.qdrant_collection,
                query_vector=list(embedding),
                limit=top_k,
                query_filter=_build_filter(filter),
            )
        except Exception as exc:  # pragma: no cover - upstream
            raise ExternalServiceError("Qdrant search failed.", cause=exc) from exc
        out: list[VectorStoreQueryResult] = []
        for point in response:
            payload = dict(point.payload or {})
            text = payload.pop("text", "")
            out.append(
                VectorStoreQueryResult(
                    id=str(point.id),
                    text=text,
                    score=float(point.score or 0.0),
                    metadata=payload,
                )
            )
        return out

    def count(self) -> int:  # pragma: no cover - integration
        client = self._resolve_client()
        info = client.get_collection(collection_name=self.settings.qdrant_collection)
        return int(info.points_count or 0)


def _build_filter(filter: dict[str, object] | None):  # pragma: no cover - integration
    if not filter or qmodels is None:
        return None
    must = [
        qmodels.FieldCondition(key=key, match=qmodels.MatchValue(value=value))
        for key, value in filter.items()
    ]
    return qmodels.Filter(must=must)


__all__ = ["QdrantVectorStore"]
