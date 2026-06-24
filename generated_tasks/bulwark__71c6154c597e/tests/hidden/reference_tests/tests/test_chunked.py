"""Tests for the streaming chunked decoder."""

from __future__ import annotations

import pytest

from bulwark.chunked import ChunkedDecoder, ChunkError


def _decode(raw: bytes, *, max_body: int = 16 << 20) -> bytes:
    dec = ChunkedDecoder(max_body=max_body)
    out = bytearray()
    for piece in dec.feed(raw):
        out.extend(piece)
    assert dec.done, f"decoder not done; state {dec._state}"
    return bytes(out)


def test_basic_chunked_body() -> None:
    raw = b"5\r\nhello\r\n6\r\n world\r\n0\r\n\r\n"
    assert _decode(raw) == b"hello world"


def test_chunk_extensions_are_ignored() -> None:
    raw = b"5;name=foo\r\nhello\r\n0\r\n\r\n"
    assert _decode(raw) == b"hello"


def test_zero_chunk_ends_body() -> None:
    raw = b"3\r\nabc\r\n0\r\n\r\n"
    assert _decode(raw) == b"abc"


def test_trailers_are_collected() -> None:
    raw = b"3\r\nabc\r\n0\r\nX-Trace-Id: 42\r\n\r\n"
    dec = ChunkedDecoder()
    out = b"".join(dec.feed(raw))
    assert dec.done
    assert out == b"abc"
    assert dec.trailers.get("x-trace-id") == "42"


def test_negative_size_rejected() -> None:
    with pytest.raises(ChunkError):
        _decode(b"-1\r\nabc\r\n0\r\n\r\n")


def test_bad_hex_rejected() -> None:
    with pytest.raises(ChunkError):
        _decode(b"zz\r\nabc\r\n0\r\n\r\n")


def test_missing_data_crlf_rejected() -> None:
    with pytest.raises(ChunkError):
        _decode(b"3\r\nabcXX0\r\n\r\n")


def test_streaming_input() -> None:
    dec = ChunkedDecoder()
    out = bytearray()
    feed_bytes = b"5\r\nhello\r\n0\r\n\r\n"
    for i in range(0, len(feed_bytes), 1):
        for piece in dec.feed(feed_bytes[i : i + 1]):
            out.extend(piece)
    assert dec.done
    assert bytes(out) == b"hello"


def test_max_body_cap() -> None:
    raw = b"a\r\n0123456789\r\n0\r\n\r\n"
    with pytest.raises(ChunkError):
        _decode(raw, max_body=5)


def test_obs_fold_trailer_rejected() -> None:
    raw = b"0\r\n\tcontinued\r\n\r\n"
    with pytest.raises(ChunkError):
        _decode(raw)
