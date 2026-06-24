"""Chunker tests."""

from __future__ import annotations

import pytest

from app.rag.chunking import get_chunker


@pytest.mark.parametrize("name", ["recursive", "sentence", "token", "fixed", "semantic"])
def test_chunker_factory_returns_chunkers(name: str) -> None:
    chunker = get_chunker(name)
    assert chunker.name == name


def test_recursive_chunker_respects_chunk_size() -> None:
    text = "Hello world. " * 50
    chunker = get_chunker("recursive", chunk_size=80, chunk_overlap=10)
    chunks = chunker.split_text(text)
    assert len(chunks) > 1
    assert all(len(chunk) <= 200 for chunk in chunks)


def test_sentence_chunker_splits_on_sentences() -> None:
    chunker = get_chunker("sentence", chunk_size=120, chunk_overlap=0)
    chunks = chunker.split_text("First sentence. Second sentence. Third sentence.")
    assert len(chunks) >= 1
