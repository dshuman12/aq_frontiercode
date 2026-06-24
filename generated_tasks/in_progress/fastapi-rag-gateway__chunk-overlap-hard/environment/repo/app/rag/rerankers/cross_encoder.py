"""Cross-encoder reranker — uses a sentence-transformers CrossEncoder."""

from __future__ import annotations

from collections.abc import Sequence

from app.core.exceptions import ConfigurationError
from app.rag.rerankers.base import BaseReranker
from app.rag.retrievers.base import RetrievedItem


class CrossEncoderReranker(BaseReranker):
    name = "cross_encoder"

    def __init__(self, *, settings=None) -> None:
        super().__init__(settings=settings)
        self._model = None

    def _ensure_model(self):
        if self._model is None:
            try:
                from sentence_transformers import CrossEncoder
            except Exception as exc:  # pragma: no cover - optional dep
                raise ConfigurationError(
                    "Install 'sentence-transformers' to use the cross-encoder reranker."
                ) from exc
            self._model = CrossEncoder(self.settings.rerank_model)
        return self._model

    def rerank(
        self,
        query: str,
        items: Sequence[RetrievedItem],
        *,
        top_k: int | None = None,
    ) -> list[RetrievedItem]:  # pragma: no cover - integration heavy
        if not items:
            return []
        model = self._ensure_model()
        pairs = [[query, item.text] for item in items]
        scores = model.predict(pairs)
        ranked = sorted(zip(items, scores), key=lambda entry: float(entry[1]), reverse=True)
        out: list[RetrievedItem] = []
        for index, (item, score) in enumerate(ranked):
            out.append(
                RetrievedItem(
                    id=item.id,
                    text=item.text,
                    score=float(score),
                    rank=index + 1,
                    metadata=dict(item.metadata),
                    document_id=item.document_id,
                    document_title=item.document_title,
                )
            )
        if top_k is None:
            return out
        return out[:top_k]


__all__ = ["CrossEncoderReranker"]
