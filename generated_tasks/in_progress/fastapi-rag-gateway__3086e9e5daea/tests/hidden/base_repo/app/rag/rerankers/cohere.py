"""Cohere Rerank API wrapper."""

from __future__ import annotations

from collections.abc import Sequence

from app.core.exceptions import ConfigurationError, ExternalServiceError
from app.rag.rerankers.base import BaseReranker
from app.rag.retrievers.base import RetrievedItem


class CohereReranker(BaseReranker):
    name = "cohere"

    def __init__(self, *, settings=None) -> None:
        super().__init__(settings=settings)

    def _client(self):  # pragma: no cover - integration only
        try:
            import cohere  # type: ignore[import-not-found]
        except Exception as exc:
            raise ConfigurationError("Install 'cohere' to use the Cohere reranker.") from exc
        api_key = self.settings.secret("cohere_api_key")
        if not api_key:
            raise ConfigurationError("COHERE_API_KEY is not configured.")
        return cohere.Client(api_key)

    def rerank(
        self,
        query: str,
        items: Sequence[RetrievedItem],
        *,
        top_k: int | None = None,
    ) -> list[RetrievedItem]:  # pragma: no cover - integration only
        if not items:
            return []
        client = self._client()
        try:
            response = client.rerank(
                query=query,
                documents=[item.text for item in items],
                model=self.settings.rerank_model,
                top_n=top_k or len(items),
            )
        except Exception as exc:
            raise ExternalServiceError("Cohere rerank failed.", cause=exc) from exc
        out: list[RetrievedItem] = []
        for index, result in enumerate(response.results):
            original = items[result.index]
            out.append(
                RetrievedItem(
                    id=original.id,
                    text=original.text,
                    score=float(result.relevance_score),
                    rank=index + 1,
                    metadata=dict(original.metadata),
                    document_id=original.document_id,
                    document_title=original.document_title,
                )
            )
        return out


__all__ = ["CohereReranker"]
