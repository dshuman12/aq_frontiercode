"""Naive fixed-size character chunker."""

from __future__ import annotations

from app.rag.chunking.base import BaseChunker


class FixedChunker(BaseChunker):
    """Splits text into fixed-size windows with optional overlap."""

    name = "fixed"

    def split_text(self, text: str) -> list[str]:
        if not text:
            return []
        return [text[start:end] for start, end in self._plan_windows(len(text))]

    def _plan_windows(self, length: int) -> list[tuple[int, int]]:
        """Plan ``(start, end)`` spans covering ``length`` characters.

        Each span is ``chunk_size`` characters (the final one may be shorter),
        and consecutive spans share ``chunk_overlap`` characters so downstream
        embeddings keep context across the seam. ``ChunkOptions`` already
        guarantees ``0 <= chunk_overlap < chunk_size``.
        """

        size = self.options.chunk_size
        overlap = self.options.chunk_overlap
        windows: list[tuple[int, int]] = []
        start = 0
        while start < length:
            end = min(start + size, length)
            windows.append((start, end))
            if end == length:
                break
            # Rewind from the window end by the overlap so the next span
            # re-reads `overlap` trailing characters; never stall.
            start = max(end - overlap + 1, start + 1)
        return windows


__all__ = ["FixedChunker"]
