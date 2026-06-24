"""URL loader.

Pulls a document from an HTTP(S) URL using :mod:`httpx` if available,
falling back to :mod:`urllib`. Content is treated as HTML if it has an
HTML mime type, otherwise as plain text.
"""

from __future__ import annotations

from pathlib import Path

from app.core.exceptions import ConfigurationError, ExternalServiceError
from app.rag.loaders.base import BaseLoader, LoaderResult
from app.rag.loaders.html import _html_to_text  # type: ignore[attr-defined]

try:  # pragma: no cover - optional dependency
    import httpx
except Exception:  # pragma: no cover - graceful degradation
    httpx = None  # type: ignore[assignment]


class UrlLoader(BaseLoader):
    name = "url"

    def load_path(self, path: str | Path) -> LoaderResult:
        return self.load_url(str(path))

    def load_url(self, url: str) -> LoaderResult:
        if httpx is None:
            raise ConfigurationError(
                "URL loading requires the 'httpx' package — install it with pip."
            )
        try:
            response = httpx.get(url, timeout=30.0, follow_redirects=True)
            response.raise_for_status()
        except Exception as exc:  # pragma: no cover - network behaviour
            raise ExternalServiceError(f"Failed to fetch URL: {url}", cause=exc) from exc
        content_type = response.headers.get("content-type", "text/plain")
        body = response.text
        text = _html_to_text(body) if "html" in content_type.lower() else body
        title = url.rsplit("/", 1)[-1] or url
        return LoaderResult(
            documents=self._make_documents(text, title=title, source=url),
            content_type=content_type,
            size_bytes=len(response.content),
            checksum=self._checksum(response.content),
            extras={"url": url, "status_code": response.status_code},
        )


__all__ = ["UrlLoader"]
