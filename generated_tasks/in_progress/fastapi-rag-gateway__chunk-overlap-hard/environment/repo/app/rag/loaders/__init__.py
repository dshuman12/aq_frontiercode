"""Document loaders.

A *loader* turns an opaque source (a file path, an HTTP URL, raw
bytes) into one or more :class:`~app.rag.types.Document` instances. The
:class:`LoaderResult` wrapper carries useful metadata (mime type,
checksum, byte size) so the ingestion pipeline can record it without
re-deriving values from the file system.
"""

from __future__ import annotations

from pathlib import Path

from app.rag.loaders.base import BaseLoader, LoaderResult
from app.rag.loaders.docx import DocxLoader
from app.rag.loaders.html import HtmlLoader
from app.rag.loaders.markdown import MarkdownLoader
from app.rag.loaders.pdf import PdfLoader
from app.rag.loaders.text import TextLoader
from app.rag.loaders.url import UrlLoader

DocumentLoader = BaseLoader

_REGISTRY: dict[str, type[BaseLoader]] = {
    "txt": TextLoader,
    "text": TextLoader,
    "md": MarkdownLoader,
    "markdown": MarkdownLoader,
    "rst": MarkdownLoader,
    "html": HtmlLoader,
    "htm": HtmlLoader,
    "pdf": PdfLoader,
    "docx": DocxLoader,
    "url": UrlLoader,
}


def get_loader(name_or_path: str) -> BaseLoader:
    """Return a loader instance for the given name, extension or URL."""

    candidate = name_or_path.lower()
    if candidate.startswith("http://") or candidate.startswith("https://"):
        return UrlLoader()
    if candidate in _REGISTRY:
        return _REGISTRY[candidate]()
    suffix = Path(candidate).suffix.lstrip(".")
    if suffix in _REGISTRY:
        return _REGISTRY[suffix]()
    return TextLoader()


def register_loader(name: str, loader_cls: type[BaseLoader]) -> None:
    _REGISTRY[name.lower()] = loader_cls


__all__ = [
    "BaseLoader",
    "DocumentLoader",
    "DocxLoader",
    "HtmlLoader",
    "LoaderResult",
    "MarkdownLoader",
    "PdfLoader",
    "TextLoader",
    "UrlLoader",
    "get_loader",
    "register_loader",
]
