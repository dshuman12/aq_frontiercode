"""HuggingFace Inference API embedding provider."""

from __future__ import annotations

from collections.abc import Sequence

from app.core.exceptions import ConfigurationError, ExternalServiceError
from app.rag.embeddings.base import BaseEmbeddingProvider

try:  # pragma: no cover - optional dependency
    import httpx
except Exception:  # pragma: no cover - graceful degradation
    httpx = None  # type: ignore[assignment]


class HuggingFaceEmbeddingProvider(BaseEmbeddingProvider):
    """Calls HuggingFace's hosted inference endpoints over HTTP."""

    name = "huggingface"
    BASE_URL = "https://api-inference.huggingface.co/models"

    def _embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        if httpx is None:
            raise ConfigurationError("Install 'httpx' to use the HuggingFace embedding provider.")
        token = self.settings.secret("huggingface_api_key") or self.settings.secret(
            "openai_api_key"
        )
        if not token:
            raise ConfigurationError(
                "HUGGINGFACE_API_KEY is required for the HuggingFace embedder."
            )
        headers = {"Authorization": f"Bearer {token}"}
        url = f"{self.BASE_URL}/{self.model}"
        try:
            response = httpx.post(
                url,
                headers=headers,
                json={"inputs": list(texts)},
                timeout=self.timeout,
            )
            response.raise_for_status()
        except Exception as exc:  # pragma: no cover - network behaviour
            raise ExternalServiceError("HuggingFace embedding request failed.", cause=exc) from exc
        data = response.json()
        if isinstance(data, list) and data and isinstance(data[0], (int, float)):
            return [list(map(float, data))]
        return [list(map(float, item)) for item in data]


__all__ = ["HuggingFaceEmbeddingProvider"]
