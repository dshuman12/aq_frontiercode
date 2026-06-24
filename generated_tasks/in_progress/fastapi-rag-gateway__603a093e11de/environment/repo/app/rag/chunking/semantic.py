"""Semantic-similarity-based chunker.

The implementation is lightweight: split the text into paragraphs and
greedily merge adjacent paragraphs whose Jaccard similarity over
lower-cased word tokens is above a threshold. It's intentionally
embedding-free so the chunker can run during local indexing without
network access.
"""

from __future__ import annotations

import re
from collections.abc import Iterable

from app.rag.chunking.base import BaseChunker

_WORD = re.compile(r"[A-Za-z0-9_]+")


class SemanticChunker(BaseChunker):
    name = "semantic"

    def split_text(self, text: str) -> list[str]:
        threshold = float(self.options.extra.get("similarity_threshold", 0.25))
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        if not paragraphs:
            return []
        chunks: list[str] = []
        current = paragraphs[0]
        for previous, current_paragraph in zip(paragraphs, paragraphs[1:]):
            similarity = _jaccard(_tokenise(previous), _tokenise(current_paragraph))
            if (
                similarity >= threshold
                and len(current) + len(current_paragraph) + 2 <= self.options.chunk_size
            ):
                current = f"{current}\n\n{current_paragraph}"
            else:
                chunks.append(current)
                current = current_paragraph
        chunks.append(current)
        return chunks


def _tokenise(text: str) -> set[str]:
    return {match.group(0).lower() for match in _WORD.finditer(text)}


def _jaccard(left: Iterable[str], right: Iterable[str]) -> float:
    left_set = set(left)
    right_set = set(right)
    if not left_set and not right_set:
        return 0.0
    union = left_set | right_set
    if not union:
        return 0.0
    return len(left_set & right_set) / len(union)


__all__ = ["SemanticChunker"]
