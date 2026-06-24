"""BM25 keyword retriever — pure-Python implementation."""

from __future__ import annotations

import math
import re
from collections import Counter
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field

from app.rag.retrievers.base import BaseRetriever, RetrievedItem

_TOKEN = re.compile(r"[A-Za-z0-9_]+")


@dataclass(slots=True)
class BM25Document:
    id: str
    text: str
    tokens: list[str] = field(default_factory=list)
    metadata: dict[str, object] = field(default_factory=dict)


class BM25Retriever(BaseRetriever):
    name = "bm25"

    def __init__(
        self,
        *,
        settings=None,
        documents: Iterable[BM25Document] | None = None,
        k1: float = 1.5,
        b: float = 0.75,
    ) -> None:
        super().__init__(settings=settings)
        self.k1 = k1
        self.b = b
        self._documents: list[BM25Document] = []
        self._term_freq: list[Counter] = []
        self._doc_freq: Counter = Counter()
        self._avgdl = 0.0
        if documents is not None:
            self.index(documents)

    # ------------------------------------------------------------------

    def index(self, documents: Iterable[BM25Document]) -> None:
        self._documents = []
        self._term_freq = []
        self._doc_freq = Counter()
        for doc in documents:
            tokens = doc.tokens or _tokenise(doc.text)
            doc.tokens = tokens
            self._documents.append(doc)
            counter = Counter(tokens)
            self._term_freq.append(counter)
            for term in set(tokens):
                self._doc_freq[term] += 1
        if self._documents:
            self._avgdl = sum(len(doc.tokens) for doc in self._documents) / len(self._documents)

    def retrieve(self, query: str, *, top_k: int = 4, **_) -> list[RetrievedItem]:
        if not self._documents or not query.strip():
            return []
        query_tokens = _tokenise(query)
        scores: list[tuple[float, BM25Document]] = []
        for doc, tf in zip(self._documents, self._term_freq):
            score = self._score(query_tokens, tf, len(doc.tokens))
            if score > 0:
                scores.append((score, doc))
        scores.sort(key=lambda entry: entry[0], reverse=True)
        return self.assign_ranks(
            [
                RetrievedItem(
                    id=doc.id,
                    text=doc.text,
                    score=float(score),
                    metadata=dict(doc.metadata),
                    document_id=doc.metadata.get("document_id"),
                    document_title=doc.metadata.get("document_title"),
                )
                for score, doc in scores[:top_k]
            ]
        )

    # ------------------------------------------------------------------

    def _score(self, query_tokens: Sequence[str], tf: Counter, doc_len: int) -> float:
        n = len(self._documents)
        score = 0.0
        for term in query_tokens:
            if term not in tf:
                continue
            df = self._doc_freq[term]
            if df == 0:
                continue
            idf = math.log((n - df + 0.5) / (df + 0.5) + 1.0)
            term_freq = tf[term]
            denominator = term_freq + self.k1 * (
                1 - self.b + self.b * doc_len / (self._avgdl or 1.0)
            )
            score += idf * (term_freq * (self.k1 + 1)) / (denominator or 1.0)
        return score


def _tokenise(text: str) -> list[str]:
    return [match.group(0).lower() for match in _TOKEN.finditer(text or "")]


__all__ = ["BM25Document", "BM25Retriever"]
