"""Tests for the HTTP/1.1 wire parser."""

from __future__ import annotations

import pytest

from bulwark.wire import WireError, parse_request_head


def _bytes(s: str) -> bytes:
    return s.encode("ascii")


def test_simple_get() -> None:
    raw = _bytes(
        "GET / HTTP/1.1\r\n"
        "Host: example.com\r\n"
        "\r\n"
    )
    req = parse_request_head(raw)
    assert req.method == "GET"
    assert req.target == "/"
    assert req.http_version == "HTTP/1.1"
    assert req.content_length == 0
    assert req.chunked is False
    assert req.headers.get("host") == "example.com"


def test_post_with_content_length() -> None:
    raw = _bytes(
        "POST /x HTTP/1.1\r\n"
        "Host: a\r\n"
        "Content-Length: 7\r\n"
        "\r\n"
    )
    req = parse_request_head(raw)
    assert req.content_length == 7
    assert req.chunked is False


def test_chunked_request() -> None:
    raw = _bytes(
        "POST /x HTTP/1.1\r\n"
        "Host: a\r\n"
        "Transfer-Encoding: chunked\r\n"
        "\r\n"
    )
    req = parse_request_head(raw)
    assert req.chunked is True
    assert req.content_length is None


def test_te_and_cl_together_drops_cl() -> None:
    """RFC 7230 §3.3.3: when both TE and CL are present, TE wins
    and CL must be removed to prevent smuggling."""
    raw = _bytes(
        "POST /x HTTP/1.1\r\n"
        "Host: a\r\n"
        "Transfer-Encoding: chunked\r\n"
        "Content-Length: 13\r\n"
        "\r\n"
    )
    req = parse_request_head(raw)
    assert req.chunked is True
    assert req.content_length is None
    assert "content-length" not in req.headers


def test_te_without_chunked_final_is_rejected() -> None:
    raw = _bytes(
        "POST /x HTTP/1.1\r\n"
        "Host: a\r\n"
        "Transfer-Encoding: gzip\r\n"
        "\r\n"
    )
    with pytest.raises(WireError):
        parse_request_head(raw)


def test_obs_fold_is_rejected() -> None:
    raw = _bytes(
        "GET / HTTP/1.1\r\n"
        "X-Foo: a\r\n"
        " continued\r\n"
        "\r\n"
    )
    with pytest.raises(WireError):
        parse_request_head(raw)


def test_negative_content_length_rejected() -> None:
    raw = _bytes(
        "POST / HTTP/1.1\r\n"
        "Content-Length: -1\r\n"
        "\r\n"
    )
    with pytest.raises(WireError):
        parse_request_head(raw)


def test_unknown_method_rejected() -> None:
    raw = _bytes("FROBNICATE / HTTP/1.1\r\n\r\n")
    with pytest.raises(WireError):
        parse_request_head(raw)


def test_request_without_double_crlf_rejected() -> None:
    with pytest.raises(WireError):
        parse_request_head(b"GET / HTTP/1.1\r\nHost: a\r\n")
