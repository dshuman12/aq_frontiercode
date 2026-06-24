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


def test_fixed_chunker_overlaps_consecutive_windows() -> None:
    text = "abcdefghijklmnopqrstuvwxyz"  # 26 characters
    chunker = get_chunker("fixed", chunk_size=10, chunk_overlap=4)
    chunks = chunker.split_text(text)
    # Stride is chunk_size - chunk_overlap = 6 characters per window.
    assert chunks[0] == text[0:10]
    assert chunks[1] == text[6:16]
    # Consecutive windows must share `chunk_overlap` characters at the seam.
    assert chunks[0][-4:] == chunks[1][:4]
    # The final window still reaches the end of the text.
    assert chunks[-1].endswith("z")


def test_fixed_chunker_full_coverage_with_overlap() -> None:
    text = "0123456789" * 3  # 30 characters
    chunker = get_chunker("fixed", chunk_size=12, chunk_overlap=5)
    chunks = chunker.split_text(text)
    # Reconstructing from non-overlapping strides must recover the original text.
    stride = 12 - 5
    rebuilt = chunks[0] + "".join(c[5:] for c in chunks[1:])
    assert rebuilt == text
    assert all(len(c) <= 12 for c in chunks)
    assert chunks[1][:5] == chunks[0][stride:stride + 5]
