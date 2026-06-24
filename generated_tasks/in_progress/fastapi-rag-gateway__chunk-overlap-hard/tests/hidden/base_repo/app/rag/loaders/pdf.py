"""PDF loader (best-effort).

Tries :mod:`pypdf` first, then falls back to the older :mod:`PyPDF2`
package. If neither is installed, the loader raises a clear
:class:`ConfigurationError` so callers know which dependency to add.
"""

from __future__ import annotations

from pathlib import Path

from app.core.exceptions import ConfigurationError, IndexingError
from app.rag.loaders.base import BaseLoader, LoaderResult
from app.rag.types import Document

try:  # pragma: no cover - optional dependency
    from pypdf import PdfReader
except Exception:  # pragma: no cover - fallback
    try:
        from PyPDF2 import PdfReader  # type: ignore[no-redef]
    except Exception:
        PdfReader = None  # type: ignore[assignment]


class PdfLoader(BaseLoader):
    name = "pdf"

    @classmethod
    def supported_extensions(cls):
        return (".pdf",)

    def load_path(self, path: str | Path) -> LoaderResult:
        if PdfReader is None:
            raise ConfigurationError(
                "PDF support requires the 'pypdf' (or legacy 'PyPDF2') package."
            )
        p = Path(path)
        data, size = self._read_path(p)
        try:
            reader = PdfReader(str(p))
        except Exception as exc:  # pragma: no cover - upstream behaviour
            raise IndexingError(f"Failed to parse PDF {p.name}", cause=exc) from exc
        pages: list[Document] = []
        for index, page in enumerate(reader.pages):
            try:
                text = page.extract_text() or ""
            except Exception:  # pragma: no cover - defensive
                text = ""
            text = text.strip()
            if not text:
                continue
            pages.append(
                Document(
                    text=text,
                    title=f"{p.stem} (page {index + 1})",
                    source=str(p.resolve()),
                    metadata={"page": index + 1},
                )
            )
        return LoaderResult(
            documents=pages,
            content_type="application/pdf",
            size_bytes=size,
            checksum=self._checksum(data),
            extras={"page_count": len(reader.pages)},
        )


__all__ = ["PdfLoader"]
