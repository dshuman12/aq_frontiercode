"""OpenAI embedding provider."""

from __future__ import annotations

from collections.abc import Sequence

from app.core.exceptions import ConfigurationError, ExternalServiceError
from app.rag.embeddings.base import BaseEmbeddingProvider

try:  # pragma: no cover - optional dependency
    from openai import OpenAI
except Exception:  # pragma: no cover - graceful degradation
    OpenAI = None  # type: ignore[assignment]


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    """Wraps the :mod:`openai` Python client."""

    name = "openai"

    def __init__(self, *, settings=None, client=None) -> None:
        super().__init__(settings=settings)
        self._client_override = client

    def _make_client(self):
        if self._client_override is not None:
            return self._client_override
        if OpenAI is None:
            raise ConfigurationError(
                "Install the 'openai' package to use the OpenAI embedding provider."
            )
        api_key = self.settings.secret("openai_api_key")
        if not api_key:
            raise ConfigurationError("OPENAI_API_KEY is not configured.")
        return OpenAI(api_key=api_key)

    def _embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        client = self._make_client()
        try:
            response = client.embeddings.create(
                model=self.model,
                input=list(texts),
            )
        except Exception as exc:  # pragma: no cover - network behaviour
            raise ExternalServiceError("OpenAI embedding request failed.", cause=exc) from exc
        return [item.embedding for item in response.data]


__all__ = ["OpenAIEmbeddingProvider"]
