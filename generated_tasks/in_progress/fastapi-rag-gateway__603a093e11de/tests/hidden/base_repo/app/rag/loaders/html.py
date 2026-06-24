"""HTML loader.

Falls back to a regex-based stripper when BeautifulSoup is not
available so the loader continues to work in minimal environments.
"""

from __future__ import annotations

import re
from html import unescape
from pathlib import Path

from app.rag.loaders.base import BaseLoader, LoaderResult

try:  # pragma: no cover - optional dependency
    from bs4 import BeautifulSoup
except Exception:  # pragma: no cover - graceful degradation
    BeautifulSoup = None  # type: ignore[assignment]

_SCRIPT_OR_STYLE = re.compile(r"<(script|style)[\s>][^<]*?</\1>", re.IGNORECASE | re.DOTALL)
_TAG = re.compile(r"<[^>]+>")
_WHITESPACE = re.compile(r"\s+")


class HtmlLoader(BaseLoader):
    name = "html"

    @classmethod
    def supported_extensions(cls):
        return (".html", ".htm")

    def load_path(self, path: str | Path) -> LoaderResult:
        p = Path(path)
        data, size = self._read_path(p)
        raw = data.decode("utf-8", errors="replace")
        text = _html_to_text(raw)
        return LoaderResult(
            documents=self._make_documents(text, title=p.stem, source=str(p.resolve())),
            content_type="text/html",
            size_bytes=size,
            checksum=self._checksum(data),
            extras={"raw_html": raw},
        )


def _html_to_text(raw: str) -> str:
    if BeautifulSoup is not None:
        soup = BeautifulSoup(raw, "html.parser")
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        text = soup.get_text(" ", strip=True)
    else:
        text = _SCRIPT_OR_STYLE.sub("", raw)
        text = _TAG.sub(" ", text)
        text = unescape(text)
    return _WHITESPACE.sub(" ", text).strip()


__all__ = ["HtmlLoader"]
