"""Document loader tests."""

from __future__ import annotations

from app.rag.loaders import get_loader


def test_text_loader_round_trips_bytes() -> None:
    loader = get_loader("foo.txt")
    result = loader.load_bytes(b"hello world", filename="hello.txt")
    assert result.documents
    assert result.documents[0].text.strip() == "hello world"


def test_markdown_loader_strips_simple_formatting() -> None:
    loader = get_loader("README.md")
    body = b"# Title\n\nSome **bold** and `code` text.\n"
    result = loader.load_bytes(body, filename="README.md")
    text = result.documents[0].text
    assert "Title" in text
    assert "bold" in text
