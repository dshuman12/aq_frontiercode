"""pgvector backend (PostgreSQL extension)."""

from __future__ import annotations

from collections.abc import Sequence

from app.core.exceptions import ConfigurationError
from app.rag.vectorstores.base import (
    BaseVectorStore,
    VectorStoreItem,
    VectorStoreQueryResult,
)

try:  # pragma: no cover - optional
    import psycopg  # type: ignore[import-not-found]
except Exception:  # pragma: no cover
    psycopg = None  # type: ignore[assignment]


class PgVectorStore(BaseVectorStore):
    name = "pgvector"

    DEFAULT_TABLE = "rag_chunks"

    def __init__(self, *, settings=None) -> None:
        super().__init__(settings=settings)
        if psycopg is None:
            raise ConfigurationError("Install 'psycopg[binary]' (>=3) to use the pgvector backend.")
        self._dsn = self.settings.pgvector_dsn
        if not self._dsn:
            raise ConfigurationError("PGVECTOR_DSN is not configured.")

    def _connect(self):  # pragma: no cover - integration
        return psycopg.connect(self._dsn)

    def upsert(self, items: Sequence[VectorStoreItem]) -> None:  # pragma: no cover - integration
        if not items:
            return
        with self._connect() as conn, conn.cursor() as cur:
            cur.executemany(
                f"""
                INSERT INTO {self.DEFAULT_TABLE} (id, text, embedding, metadata)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE
                SET text = EXCLUDED.text,
                    embedding = EXCLUDED.embedding,
                    metadata = EXCLUDED.metadata
                """,
                [(item.id, item.text, list(item.embedding), item.metadata) for item in items],
            )

    def delete(self, ids: Sequence[str]) -> None:  # pragma: no cover - integration
        if not ids:
            return
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                f"DELETE FROM {self.DEFAULT_TABLE} WHERE id = ANY(%s)",
                (list(ids),),
            )

    def query(
        self,
        embedding: Sequence[float],
        *,
        top_k: int = 4,
        filter: dict[str, object] | None = None,
    ) -> list[VectorStoreQueryResult]:  # pragma: no cover - integration
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, text, metadata, 1 - (embedding <=> %s::vector) AS score
                FROM {self.DEFAULT_TABLE}
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (list(embedding), list(embedding), top_k),
            )
            rows = cur.fetchall()
        return [
            VectorStoreQueryResult(
                id=row[0],
                text=row[1] or "",
                metadata=row[2] or {},
                score=float(row[3] or 0.0),
            )
            for row in rows
        ]

    def count(self) -> int:  # pragma: no cover - integration
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM {self.DEFAULT_TABLE}")
            return int(cur.fetchone()[0])


__all__ = ["PgVectorStore"]
