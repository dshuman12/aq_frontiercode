"""Abstract embedding provider."""

from __future__ import annotations

import asyncio
import math
from abc import ABC, abstractmethod
from collections.abc import Iterable, Sequence

from app.core.config import Settings, get_settings
from app.core.constants import DEFAULT_EMBEDDING_TIMEOUT_SECONDS
from app.rag.types import EmbeddingResult


class BaseEmbeddingProvider(ABC):
    """Embedding provider interface."""

    name: str = "base"

    def __init__(self, *, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.batch_size = self.settings.embedding_batch_size
        self.timeout = self.settings.embedding_timeout_seconds or DEFAULT_EMBEDDING_TIMEOUT_SECONDS

    # ------------------------------------------------------------------

    @abstractmethod
    def _embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        """Return one vector per ``text``."""

    @property
    def model(self) -> str:
        return self.settings.embedding_model

    @property
    def dimensions(self) -> int:
        return int(self.settings.embedding_dimensions)

    def embed(self, text: str) -> EmbeddingResult:
        vectors = self._embed_texts([text])
        return EmbeddingResult(vector=vectors[0], model=self.model)

    def embed_many(self, texts: Iterable[str]) -> list[EmbeddingResult]:
        items: list[EmbeddingResult] = []
        materialised = list(texts)
        for batch in _batched(materialised, self.batch_size):
            vectors = self._embed_texts(batch)
            for vector in vectors:
                items.append(EmbeddingResult(vector=vector, model=self.model))
        return items

    async def aembed(self, text: str) -> EmbeddingResult:
        loop = asyncio.get_running_loop()
        return await asyncio.wait_for(
            loop.run_in_executor(None, self.embed, text),
            timeout=self.timeout,
        )

    async def aembed_many(self, texts: Iterable[str]) -> list[EmbeddingResult]:
        loop = asyncio.get_running_loop()
        return await asyncio.wait_for(
            loop.run_in_executor(None, lambda: self.embed_many(texts)),
            timeout=self.timeout * 4,
        )

    @staticmethod
    def cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
        if not left or not right:
            return 0.0
        dot = sum(a * b for a, b in zip(left, right))
        norm_left = math.sqrt(sum(a * a for a in left))
        norm_right = math.sqrt(sum(b * b for b in right))
        if not norm_left or not norm_right:
            return 0.0
        return dot / (norm_left * norm_right)


def _batched(items: list[str], size: int) -> Iterable[list[str]]:
    if size <= 0:
        yield items
        return
    for index in range(0, len(items), size):
        yield items[index : index + size]


# Public alias for typing convenience.
EmbeddingProvider = BaseEmbeddingProvider


__all__ = ["BaseEmbeddingProvider", "EmbeddingProvider"]
