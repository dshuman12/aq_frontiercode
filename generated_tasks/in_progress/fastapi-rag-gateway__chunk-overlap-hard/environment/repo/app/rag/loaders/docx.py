"""DOCX loader using :mod:`python-docx`."""

from __future__ import annotations

from pathlib import Path

from app.core.exceptions import ConfigurationError, IndexingError
from app.rag.loaders.base import BaseLoader, LoaderResult

try:  # pragma: no cover - optional dependency
    import docx
except Exception:  # pragma: no cover - graceful degradation
    docx = None  # type: ignore[assignment]


class DocxLoader(BaseLoader):
    name = "docx"

    @classmethod
    def supported_extensions(cls):
        return (".docx",)

    def load_path(self, path: str | Path) -> LoaderResult:
        if docx is None:
            raise ConfigurationError("DOCX support requires the 'python-docx' package.")
        p = Path(path)
        data, size = self._read_path(p)
        try:
            document = docx.Document(str(p))
        except Exception as exc:  # pragma: no cover - upstream behaviour
            raise IndexingError(f"Failed to parse DOCX {p.name}", cause=exc) from exc
        text = "\n".join(paragraph.text for paragraph in document.paragraphs)
        return LoaderResult(
            documents=self._make_documents(text.strip(), title=p.stem, source=str(p.resolve())),
            content_type=(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ),
            size_bytes=size,
            checksum=self._checksum(data),
        )


__all__ = ["DocxLoader"]
