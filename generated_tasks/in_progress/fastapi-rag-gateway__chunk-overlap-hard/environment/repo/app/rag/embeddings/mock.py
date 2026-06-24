"""Deterministic mock embedding provider used in tests.

Generates a vector by hashing the input text into a fixed-length
sequence of floats. The output is stable across runs which lets us use
``cosine_similarity`` in tests without having to wire up a real
provider.
"""

from __future__ import annotations

import hashlib
import math
from collections.abc import Sequence

from app.rag.embeddings.base import BaseEmbeddingProvider


class MockEmbeddingProvider(BaseEmbeddingProvider):
    name = "mock"

    @property
    def dimensions(self) -> int:
        return int(self.settings.embedding_dimensions or 32)

    def _embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        return [self._embed_text(text) for text in texts]

    def _embed_text(self, text: str) -> list[float]:
        digest = hashlib.sha256((text or "").encode("utf-8")).digest()
        seeds = [digest[i % len(digest)] for i in range(self.dimensions)]
        vector = [(seed / 255.0) - 0.5 for seed in seeds]
        norm = math.sqrt(sum(x * x for x in vector)) or 1.0
        return [x / norm for x in vector]


__all__ = ["MockEmbeddingProvider"]
