"""Plain-text loader."""

from __future__ import annotations

from pathlib import Path

from app.rag.loaders.base import BaseLoader, LoaderResult


class TextLoader(BaseLoader):
    name = "text"

    @classmethod
    def supported_extensions(cls):
        return (".txt", ".text", ".log")

    def load_path(self, path: str | Path) -> LoaderResult:
        p = Path(path)
        data, size = self._read_path(p)
        text = data.decode("utf-8", errors="replace")
        return LoaderResult(
            documents=self._make_documents(text, title=p.stem, source=str(p.resolve())),
            content_type="text/plain",
            size_bytes=size,
            checksum=self._checksum(data),
        )


__all__ = ["TextLoader"]
