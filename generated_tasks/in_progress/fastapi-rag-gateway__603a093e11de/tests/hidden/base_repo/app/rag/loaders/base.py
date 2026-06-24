"""Loader interface and helpers."""

from __future__ import annotations

import hashlib
from abc import ABC, abstractmethod
from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path

from app.rag.types import Document


@dataclass(slots=True)
class LoaderResult:
    """Wraps the documents and side-channel metadata returned by a loader."""

    documents: list[Document]
    content_type: str | None = None
    size_bytes: int | None = None
    checksum: str | None = None
    extras: dict[str, object] = field(default_factory=dict)


class BaseLoader(ABC):
    """Async-aware loader base class."""

    name: str = "base"

    @abstractmethod
    def load_path(self, path: str | Path) -> LoaderResult:
        """Load documents from a filesystem path."""

    def load_bytes(self, data: bytes, *, filename: str | None = None) -> LoaderResult:
        """Load documents from in-memory bytes."""

        text = data.decode("utf-8", errors="replace")
        title = filename or "uploaded"
        return LoaderResult(
            documents=[Document(text=text, title=title, source=filename)],
            content_type="text/plain",
            size_bytes=len(data),
            checksum=hashlib.sha256(data).hexdigest(),
        )

    def load_url(self, url: str) -> LoaderResult:  # pragma: no cover - default
        raise NotImplementedError(f"{self.name} loader does not support URLs")

    # Convenience helpers ------------------------------------------------

    @staticmethod
    def _checksum(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    @staticmethod
    def _read_path(path: str | Path) -> tuple[bytes, int]:
        p = Path(path)
        data = p.read_bytes()
        return data, len(data)

    @staticmethod
    def _make_documents(text: str, *, title: str, source: str | None) -> list[Document]:
        return [Document(text=text, title=title, source=source)]

    def __repr__(self) -> str:  # pragma: no cover - cosmetic
        return f"<{type(self).__name__} name={self.name!r}>"

    @classmethod
    def supported_extensions(cls) -> Iterable[str]:
        return ()


__all__ = ["BaseLoader", "LoaderResult"]
