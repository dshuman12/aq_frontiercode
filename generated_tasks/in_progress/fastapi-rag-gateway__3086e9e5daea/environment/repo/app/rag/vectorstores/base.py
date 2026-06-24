"""Vector store abstraction."""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field

from app.core.config import Settings, get_settings


@dataclass(slots=True)
class VectorStoreItem:
    """A single item that can be inserted into a vector store."""

    id: str
    text: str
    embedding: list[float]
    metadata: dict[str, object] = field(default_factory=dict)


@dataclass(slots=True)
class VectorStoreQueryResult:
    """A single search hit returned by a vector store."""

    id: str
    text: str
    score: float
    metadata: dict[str, object] = field(default_factory=dict)
    embedding: list[float] | None = None


class BaseVectorStore(ABC):
    name: str = "base"

    def __init__(self, *, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    # ------------------------------------------------------------------
    # Synchronous primitives — concrete subclasses implement these.
    # ------------------------------------------------------------------

    @abstractmethod
    def upsert(self, items: Sequence[VectorStoreItem]) -> None:
        """Insert or replace ``items``."""

    @abstractmethod
    def delete(self, ids: Sequence[str]) -> None:
        """Remove vectors by id."""

    @abstractmethod
    def query(
        self,
        embedding: Sequence[float],
        *,
        top_k: int = 4,
        filter: dict[str, object] | None = None,
    ) -> list[VectorStoreQueryResult]:
        """Return the ``top_k`` items most similar to ``embedding``."""

    @abstractmethod
    def count(self) -> int:
        """Return the total number of stored vectors."""

    def reset(self) -> None:  # pragma: no cover - default
        """Drop all data — subclasses may override."""

        raise NotImplementedError

    # ------------------------------------------------------------------
    # Async wrappers — default to running the sync version on the
    # default executor. Subclasses may override with native async.
    # ------------------------------------------------------------------

    async def aupsert(self, items: Sequence[VectorStoreItem]) -> None:
        await asyncio.get_running_loop().run_in_executor(None, self.upsert, items)

    async def adelete(self, ids: Sequence[str]) -> None:
        await asyncio.get_running_loop().run_in_executor(None, self.delete, list(ids))

    async def aquery(
        self,
        embedding: Sequence[float],
        *,
        top_k: int = 4,
        filter: dict[str, object] | None = None,
    ) -> list[VectorStoreQueryResult]:
        return await asyncio.get_running_loop().run_in_executor(
            None,
            lambda: self.query(embedding, top_k=top_k, filter=filter),
        )

    async def acount(self) -> int:
        return await asyncio.get_running_loop().run_in_executor(None, self.count)

    # ------------------------------------------------------------------
    # Helper utilities
    # ------------------------------------------------------------------

    def upsert_iterable(self, items: Iterable[VectorStoreItem]) -> None:
        materialised = list(items)
        if materialised:
            self.upsert(materialised)


VectorStore = BaseVectorStore


__all__ = [
    "BaseVectorStore",
    "VectorStore",
    "VectorStoreItem",
    "VectorStoreQueryResult",
]
