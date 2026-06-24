"""Ensemble retriever — weighted combination of multiple retrievers."""

from __future__ import annotations

from collections.abc import Sequence

from app.rag.retrievers.base import BaseRetriever, RetrievedItem


class EnsembleRetriever(BaseRetriever):
    name = "ensemble"

    def __init__(
        self,
        *,
        settings=None,
        retrievers: Sequence[tuple[BaseRetriever, float]] | None = None,
    ) -> None:
        super().__init__(settings=settings)
        if not retrievers:
            raise ValueError("EnsembleRetriever requires at least one retriever")
        total_weight = sum(weight for _, weight in retrievers)
        if total_weight <= 0:
            raise ValueError("Ensemble weights must sum to a positive number")
        self.retrievers: list[tuple[BaseRetriever, float]] = [
            (retriever, weight / total_weight) for retriever, weight in retrievers
        ]

    def retrieve(self, query: str, *, top_k: int = 4, **kwargs) -> list[RetrievedItem]:
        scores: dict[str, float] = {}
        items: dict[str, RetrievedItem] = {}
        for retriever, weight in self.retrievers:
            results = retriever.retrieve(query, top_k=top_k * 2, **kwargs)
            for result in results:
                scores[result.id] = scores.get(result.id, 0.0) + weight * result.score
                items.setdefault(result.id, result)
        ordered = sorted(scores.items(), key=lambda entry: entry[1], reverse=True)
        return self.assign_ranks(
            [
                RetrievedItem(
                    id=identifier,
                    text=items[identifier].text,
                    score=float(score),
                    metadata=dict(items[identifier].metadata),
                    document_id=items[identifier].document_id,
                    document_title=items[identifier].document_title,
                )
                for identifier, score in ordered[:top_k]
            ]
        )


__all__ = ["EnsembleRetriever"]
