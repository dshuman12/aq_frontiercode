"""Recursive character chunker.

Mimics LangChain's classic ``RecursiveCharacterTextSplitter``: try a
list of separators in priority order, falling back to a brutal slice
when nothing else works. This keeps semantically-meaningful boundaries
(paragraphs, sentences) intact whenever possible.
"""

from __future__ import annotations

from app.rag.chunking.base import BaseChunker


class RecursiveCharacterChunker(BaseChunker):
    """Recursive chunker that prefers natural separators."""

    name = "recursive"

    DEFAULT_SEPARATORS: tuple[str, ...] = ("\n\n", "\n", ". ", "? ", "! ", " ", "")

    def split_text(self, text: str) -> list[str]:
        separators = tuple(self.options.extra.get("separators", self.DEFAULT_SEPARATORS))
        return _split_recursive(
            text=text,
            separators=separators,
            chunk_size=self.options.chunk_size,
            chunk_overlap=self.options.chunk_overlap,
            keep_separator=self.options.keep_separator,
        )


def _split_recursive(
    *,
    text: str,
    separators: tuple[str, ...],
    chunk_size: int,
    chunk_overlap: int,
    keep_separator: bool,
) -> list[str]:
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    separator = next((s for s in separators if s and s in text), "")
    next_separators = tuple(s for s in separators if s != separator)

    if not separator:
        # Brutal fallback: hard slice with overlap.
        chunks: list[str] = []
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunks.append(text[start:end])
            if end == len(text):
                break
            start = max(end - chunk_overlap, start + 1)
        return chunks

    splits = text.split(separator)
    if keep_separator and len(splits) > 1:
        splits = [(separator + piece if i > 0 else piece) for i, piece in enumerate(splits)]

    final_chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for piece in splits:
        piece_len = len(piece)
        if piece_len > chunk_size:
            if current:
                final_chunks.extend(_merge(current, chunk_size, chunk_overlap))
                current = []
                current_len = 0
            final_chunks.extend(
                _split_recursive(
                    text=piece,
                    separators=next_separators,
                    chunk_size=chunk_size,
                    chunk_overlap=chunk_overlap,
                    keep_separator=keep_separator,
                )
            )
            continue
        if current_len + piece_len > chunk_size and current:
            final_chunks.extend(_merge(current, chunk_size, chunk_overlap))
            current = current[-1:] if chunk_overlap else []
            current_len = sum(len(p) for p in current)
        current.append(piece)
        current_len += piece_len

    if current:
        final_chunks.extend(_merge(current, chunk_size, chunk_overlap))
    return [c for c in final_chunks if c]


def _merge(pieces: list[str], chunk_size: int, chunk_overlap: int) -> list[str]:
    merged = "".join(pieces)
    if len(merged) <= chunk_size:
        return [merged]
    output: list[str] = []
    start = 0
    while start < len(merged):
        end = min(start + chunk_size, len(merged))
        output.append(merged[start:end])
        if end == len(merged):
            break
        start = max(end - chunk_overlap, start + 1)
    return output


__all__ = ["RecursiveCharacterChunker"]
