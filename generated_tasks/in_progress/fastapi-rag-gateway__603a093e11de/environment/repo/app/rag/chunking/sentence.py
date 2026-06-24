"""Sentence-aware chunker."""

from __future__ import annotations

import re

from app.rag.chunking.base import BaseChunker

_SENTENCE_REGEX = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])")


class SentenceChunker(BaseChunker):
    """Greedy sentence packer that respects ``chunk_size``."""

    name = "sentence"

    def split_text(self, text: str) -> list[str]:
        sentences = _split_into_sentences(text)
        if not sentences:
            return []
        chunks: list[str] = []
        current: list[str] = []
        current_len = 0
        for sentence in sentences:
            length = len(sentence)
            if current and current_len + length + 1 > self.options.chunk_size:
                chunks.append(" ".join(current).strip())
                if self.options.chunk_overlap and current:
                    overlap = _take_tail(current, self.options.chunk_overlap)
                    current = list(overlap)
                    current_len = sum(len(p) for p in current)
                else:
                    current = []
                    current_len = 0
            current.append(sentence)
            current_len += length + 1
        if current:
            chunks.append(" ".join(current).strip())
        return chunks


def _split_into_sentences(text: str) -> list[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    out: list[str] = []
    for paragraph in paragraphs:
        out.extend(s.strip() for s in _SENTENCE_REGEX.split(paragraph) if s.strip())
    return out


def _take_tail(pieces: list[str], target_chars: int) -> list[str]:
    accumulated: list[str] = []
    total = 0
    for piece in reversed(pieces):
        accumulated.insert(0, piece)
        total += len(piece)
        if total >= target_chars:
            break
    return accumulated


__all__ = ["SentenceChunker"]
