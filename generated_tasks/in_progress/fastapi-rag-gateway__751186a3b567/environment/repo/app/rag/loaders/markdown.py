"""Markdown / reStructuredText loader."""

from __future__ import annotations

import re
from pathlib import Path

from app.rag.loaders.base import BaseLoader, LoaderResult

_LINK = re.compile(r"\[([^\]]+)\]\(([^\)]+)\)")
_BOLD_ITALIC = re.compile(r"\*+")
_HEADERS = re.compile(r"^#+\s*", re.MULTILINE)
_BULLETS = re.compile(r"^[*+-]\s+", re.MULTILINE)


class MarkdownLoader(BaseLoader):
    name = "markdown"

    @classmethod
    def supported_extensions(cls):
        return (".md", ".markdown", ".rst")

    def load_path(self, path: str | Path) -> LoaderResult:
        p = Path(path)
        data, size = self._read_path(p)
        raw = data.decode("utf-8", errors="replace")
        text = _strip_markdown(raw)
        return LoaderResult(
            documents=self._make_documents(
                text, title=p.stem.replace("_", " "), source=str(p.resolve())
            ),
            content_type="text/markdown",
            size_bytes=size,
            checksum=self._checksum(data),
            extras={"raw_markdown": raw},
        )


def _strip_markdown(raw: str) -> str:
    text = _LINK.sub(r"\1", raw)
    text = _BOLD_ITALIC.sub("", text)
    text = _HEADERS.sub("", text)
    text = _BULLETS.sub("", text)
    return text.strip()


__all__ = ["MarkdownLoader"]
