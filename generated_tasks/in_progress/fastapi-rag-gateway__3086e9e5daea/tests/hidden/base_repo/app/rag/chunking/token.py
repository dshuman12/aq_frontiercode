"""Token-aware chunker.

Uses :mod:`tiktoken` when available to split based on real model
tokens; otherwise falls back to a coarse approximation (words) so
behaviour is sensible in test environments.
"""

from __future__ import annotations

from app.rag.chunking.base import BaseChunker

try:  # pragma: no cover - optional dependency
    import tiktoken
except Exception:  # pragma: no cover - graceful degradation
    tiktoken = None  # type: ignore[assignment]


class TokenChunker(BaseChunker):
    name = "token"

    def split_text(self, text: str) -> list[str]:
        size = self.options.chunk_size
        overlap = self.options.chunk_overlap
        encoding_name = str(self.options.extra.get("encoding", "cl100k_base"))

        if tiktoken is not None:
            encoding = tiktoken.get_encoding(encoding_name)
            tokens = encoding.encode(text)
            chunks: list[str] = []
            start = 0
            while start < len(tokens):
                end = min(start + size, len(tokens))
                chunks.append(encoding.decode(tokens[start:end]))
                if end == len(tokens):
                    break
                start = max(end - overlap, start + 1)
            return chunks

        words = text.split()
        chunks = []
        start = 0
        while start < len(words):
            end = min(start + size, len(words))
            chunks.append(" ".join(words[start:end]))
            if end == len(words):
                break
            start = max(end - overlap, start + 1)
        return chunks


__all__ = ["TokenChunker"]
