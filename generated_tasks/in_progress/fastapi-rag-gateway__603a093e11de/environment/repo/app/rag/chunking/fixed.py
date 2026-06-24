"""Naive fixed-size character chunker."""

from __future__ import annotations

from app.rag.chunking.base import BaseChunker


class FixedChunker(BaseChunker):
    """Splits text into fixed-size windows with optional overlap."""

    name = "fixed"

    def split_text(self, text: str) -> list[str]:
        size = self.options.chunk_size
        overlap = self.options.chunk_overlap
        if not text:
            return []
        chunks: list[str] = []
        start = 0
        length = len(text)
        while start < length:
            end = min(start + size, length)
            chunks.append(text[start:end])
            if end == length:
                break
            start = end
        return chunks


__all__ = ["FixedChunker"]
