"""Chroma vector store backend."""

from __future__ import annotations

from collections.abc import Sequence

from app.core.exceptions import ConfigurationError, ExternalServiceError
from app.rag.vectorstores.base import (
    BaseVectorStore,
    VectorStoreItem,
    VectorStoreQueryResult,
)

try:  # pragma: no cover - optional dependency
    import chromadb
    from chromadb.config import Settings as ChromaSettings
except Exception:  # pragma: no cover - graceful degradation
    chromadb = None  # type: ignore[assignment]
    ChromaSettings = None  # type: ignore[assignment]


class ChromaVectorStore(BaseVectorStore):
    name = "chroma"

    def __init__(self, *, settings=None, client=None, collection=None) -> None:
        super().__init__(settings=settings)
        self._client_override = client
        self._collection_override = collection
        self._collection = None

    def _resolve_collection(self):
        if self._collection_override is not None:
            return self._collection_override
        if self._collection is not None:
            return self._collection
        if chromadb is None:
            raise ConfigurationError("Install 'chromadb' to use the Chroma vector store.")
        client_kwargs = {}
        if self._client_override is None:
            persist_dir = str(self.settings.resolve_path(self.settings.chroma_persist_dir))
            try:
                client = chromadb.PersistentClient(
                    path=persist_dir,
                    settings=ChromaSettings(allow_reset=True, anonymized_telemetry=False),
                )
            except Exception as exc:  # pragma: no cover - upstream
                raise ConfigurationError(
                    f"Failed to initialise Chroma at {persist_dir!r}", cause=exc
                ) from exc
        else:
            client = self._client_override
        try:
            self._collection = client.get_or_create_collection(
                name=self.settings.chroma_collection,
                metadata={"hnsw:space": "cosine"},
            )
        except Exception as exc:  # pragma: no cover - upstream
            raise ConfigurationError("Failed to acquire Chroma collection.", cause=exc) from exc
        _ = client_kwargs
        return self._collection

    def upsert(self, items: Sequence[VectorStoreItem]) -> None:
        if not items:
            return
        collection = self._resolve_collection()
        collection.upsert(
            ids=[i.id for i in items],
            embeddings=[list(i.embedding) for i in items],
            documents=[i.text for i in items],
            metadatas=[dict(i.metadata) for i in items],
        )

    def delete(self, ids: Sequence[str]) -> None:
        if not ids:
            return
        collection = self._resolve_collection()
        collection.delete(ids=list(ids))

    def query(
        self,
        embedding: Sequence[float],
        *,
        top_k: int = 4,
        filter: dict[str, object] | None = None,
    ) -> list[VectorStoreQueryResult]:
        collection = self._resolve_collection()
        try:
            response = collection.query(
                query_embeddings=[list(embedding)],
                n_results=top_k,
                where=filter or None,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:  # pragma: no cover - upstream
            raise ExternalServiceError("Chroma query failed.", cause=exc) from exc
        ids = response.get("ids", [[]])[0]
        documents = response.get("documents", [[]])[0]
        metadatas = response.get("metadatas", [[]])[0]
        distances = response.get("distances", [[]])[0]
        out: list[VectorStoreQueryResult] = []
        for identifier, document, metadata, distance in zip(ids, documents, metadatas, distances):
            score = 1.0 - float(distance) if distance is not None else 0.0
            out.append(
                VectorStoreQueryResult(
                    id=identifier,
                    text=document or "",
                    score=score,
                    metadata=dict(metadata or {}),
                )
            )
        return out

    def count(self) -> int:
        collection = self._resolve_collection()
        return int(collection.count())

    def reset(self) -> None:
        collection = self._resolve_collection()
        existing = collection.get(include=[])
        ids = existing.get("ids", []) if existing else []
        if ids:
            collection.delete(ids=list(ids))


__all__ = ["ChromaVectorStore"]
