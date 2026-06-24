"""Local sentence-transformers embedding provider."""

from __future__ import annotations

from collections.abc import Sequence

from app.core.exceptions import ConfigurationError
from app.rag.embeddings.base import BaseEmbeddingProvider


class SentenceTransformersEmbeddingProvider(BaseEmbeddingProvider):
    """Loads a sentence-transformers model on-demand."""

    name = "sentence_transformers"

    def __init__(self, *, settings=None) -> None:
        super().__init__(settings=settings)
        self._model = None

    def _ensure_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
            except Exception as exc:  # pragma: no cover - optional dep
                raise ConfigurationError(
                    "Install 'sentence-transformers' to use this embedder."
                ) from exc
            self._model = SentenceTransformer(self.model)
        return self._model

    def _embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        model = self._ensure_model()
        vectors = model.encode(list(texts), normalize_embeddings=True, show_progress_bar=False)
        return [list(map(float, vector)) for vector in vectors]


__all__ = ["SentenceTransformersEmbeddingProvider"]
