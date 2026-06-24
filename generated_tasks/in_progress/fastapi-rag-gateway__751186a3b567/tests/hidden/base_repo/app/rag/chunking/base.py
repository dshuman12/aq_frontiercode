"""Common chunker interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field

from app.core.constants import (
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    MAX_CHUNK_SIZE,
)
from app.rag.types import Document, TextChunk


@dataclass(slots=True)
class ChunkOptions:
    """Common configuration knobs for chunkers."""

    chunk_size: int = DEFAULT_CHUNK_SIZE
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP
    keep_separator: bool = True
    strip_whitespace: bool = True
    min_chunk_size: int = 32
    extra: dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.chunk_size <= 0:
            raise ValueError("chunk_size must be positive")
        if self.chunk_size > MAX_CHUNK_SIZE:
            raise ValueError(f"chunk_size must be <= {MAX_CHUNK_SIZE}, got {self.chunk_size}")
        if self.chunk_overlap < 0:
            raise ValueError("chunk_overlap must be non-negative")
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("chunk_overlap must be smaller than chunk_size")

    @classmethod
    def from_kwargs(cls, kwargs: Mapping[str, object]) -> ChunkOptions:
        valid = {
            f.name
            for f in cls.__dataclass_fields__.values()  # type: ignore[attr-defined]
            if f.name != "extra"
        }
        recognised: dict[str, object] = {}
        extra: dict[str, object] = {}
        for key, value in kwargs.items():
            if key in valid:
                recognised[key] = value
            else:
                extra[key] = value
        return cls(**recognised, extra=extra)  # type: ignore[arg-type]


class BaseChunker(ABC):
    """Abstract base class for chunkers."""

    name: str = "base"

    def __init__(self, options: ChunkOptions | None = None) -> None:
        self.options = options or ChunkOptions()

    # ------------------------------------------------------------------

    @abstractmethod
    def split_text(self, text: str) -> list[str]:
        """Split a raw text into substrings respecting the options."""

    def chunk(self, document: Document) -> list[TextChunk]:
        """Return :class:`TextChunk` objects for ``document``."""

        text = document.text or ""
        if self.options.strip_whitespace:
            text = text.strip()
        if not text:
            return []
        pieces = [piece for piece in self.split_text(text) if piece]
        chunks: list[TextChunk] = []
        cursor = 0
        for index, piece in enumerate(pieces):
            stripped = piece.strip() if self.options.strip_whitespace else piece
            if not stripped:
                continue
            if len(stripped) < self.options.min_chunk_size and index != 0:
                if chunks:
                    last = chunks[-1]
                    merged = (last.text + " " + stripped).strip()
                    chunks[-1] = TextChunk(
                        text=merged,
                        chunk_index=last.chunk_index,
                        char_start=last.char_start,
                        char_end=cursor + len(piece),
                        document_id=last.document_id,
                        document_title=last.document_title,
                        metadata=dict(last.metadata),
                    )
                    cursor += len(piece)
                    continue
            start = text.find(stripped, cursor)
            end = start + len(stripped) if start >= 0 else None
            chunks.append(
                TextChunk(
                    text=stripped,
                    chunk_index=len(chunks),
                    char_start=start if start >= 0 else None,
                    char_end=end,
                    document_id=document.metadata.get("id"),
                    document_title=document.title,
                    metadata=_merge_metadata(document.metadata, index),
                )
            )
            cursor = (end or cursor) + 1
        return chunks

    def chunk_many(self, documents: Iterable[Document]) -> list[TextChunk]:
        out: list[TextChunk] = []
        for doc in documents:
            out.extend(self.chunk(doc))
        return out


def _merge_metadata(meta: dict[str, object], index: int) -> dict[str, object]:
    merged = dict(meta or {})
    merged.setdefault("source", meta.get("source"))
    merged["original_chunk_index"] = index
    return merged


__all__ = ["BaseChunker", "ChunkOptions"]
