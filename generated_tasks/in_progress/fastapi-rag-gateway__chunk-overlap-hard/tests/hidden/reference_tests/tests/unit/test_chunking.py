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


def _alphabet(n: int) -> str:
    return "".join(chr(97 + (i % 26)) for i in range(n))


def test_fixed_chunker_shares_exact_overlap_across_configs() -> None:
    text = _alphabet(40)
    for size, overlap in [(10, 4), (8, 3), (12, 5), (6, 1)]:
        chunker = get_chunker("fixed", chunk_size=size, chunk_overlap=overlap)
        chunks = chunker.split_text(text)
        # Every seam must share exactly `overlap` characters.
        for a, b in zip(chunks, chunks[1:]):
            assert a[-overlap:] == b[:overlap], (size, overlap, a, b)
        # Splicing the non-overlapping tail of each window rebuilds the text.
        rebuilt = chunks[0] + "".join(c[overlap:] for c in chunks[1:])
        assert rebuilt == text, (size, overlap)
        assert all(len(c) <= size for c in chunks)


def test_fixed_chunker_overlap_near_size() -> None:
    text = _alphabet(16)
    chunker = get_chunker("fixed", chunk_size=5, chunk_overlap=4)  # stride 1
    chunks = chunker.split_text(text)
    assert chunks[0] == text[0:5]
    assert chunks[1] == text[1:6]
    assert all(c[-4:] == n[:4] for c, n in zip(chunks, chunks[1:]))
    assert chunks[-1].endswith(text[-1])


def test_fixed_chunker_exact_multiple_no_phantom_or_gap() -> None:
    text = "0123456789"
    chunker = get_chunker("fixed", chunk_size=5, chunk_overlap=0)  # stride 5
    assert chunker.split_text(text) == ["01234", "56789"]


def test_fixed_chunker_text_shorter_than_window() -> None:
    chunker = get_chunker("fixed", chunk_size=50, chunk_overlap=10)
    assert chunker.split_text("short") == ["short"]
