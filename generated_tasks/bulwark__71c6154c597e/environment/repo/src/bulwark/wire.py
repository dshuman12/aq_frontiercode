"""HTTP/1.1 wire-format request parser.

A small, strict parser for the request half of HTTP/1.1. Handles only
what bulwark needs:

* request line: ``METHOD SP request-target SP HTTP-version CRLF``
* header lines: ``name ":" OWS value OWS CRLF``
* headers terminator: ``CRLF`` on its own line
* body framing per RFC 7230 §3.3.3:
  - if both ``Transfer-Encoding`` and ``Content-Length`` are present,
    ``Transfer-Encoding`` wins and ``Content-Length`` MUST be removed
    before forwarding (smuggling guard);
  - ``Transfer-Encoding`` MUST end in ``chunked``;
  - otherwise the body length is the integer in ``Content-Length``;
  - if neither header is present, the body length is zero.

The parser doesn't itself read the body; it returns a
:class:`RawRequest` describing the framing decision and lets the caller
stream the body via :mod:`bulwark.chunked`.
"""

from __future__ import annotations

from dataclasses import dataclass

from bulwark.errors import BulwarkError
from bulwark.headers import Headers


class WireError(BulwarkError):
    """Anything wrong on the wire (bad framing, bad header, etc.)."""


_VALID_METHODS = frozenset(
    {
        "GET",
        "HEAD",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS",
        "PATCH",
        "CONNECT",
        "TRACE",
    }
)


@dataclass(frozen=True, slots=True)
class RawRequest:
    method: str
    target: str
    http_version: str
    headers: Headers
    # Body framing decision. Exactly one of ``content_length`` or
    # ``chunked`` is set.
    content_length: int | None
    chunked: bool


def parse_request_head(data: bytes) -> RawRequest:
    """Parse a request head (request line + headers), terminated by CRLFCRLF.

    ``data`` is the bytes from the start of the request through (and
    including) the ``\\r\\n\\r\\n`` separator.
    """
    if b"\r\n\r\n" not in data:
        raise WireError("request head does not end in CRLFCRLF")
    head, _, _rest = data.partition(b"\r\n\r\n")
    try:
        text = head.decode("ascii")
    except UnicodeDecodeError as exc:
        raise WireError("non-ascii bytes in request head") from exc

    lines = text.split("\r\n")
    request_line = lines[0]
    raw_headers = lines[1:]

    method, target, version = _parse_request_line(request_line)
    headers = _parse_headers(raw_headers)
    cl, chunked = _decide_framing(headers)

    return RawRequest(
        method=method,
        target=target,
        http_version=version,
        headers=headers,
        content_length=cl,
        chunked=chunked,
    )


def _parse_request_line(line: str) -> tuple[str, str, str]:
    parts = line.split(" ")
    if len(parts) != 3:
        raise WireError("malformed request line")
    method, target, version = parts
    if method not in _VALID_METHODS:
        raise WireError(f"unsupported method {method!r}")
    if not version.startswith("HTTP/"):
        raise WireError("unsupported HTTP version")
    if not target:
        raise WireError("empty request target")
    return method, target, version


def _parse_headers(raw: list[str]) -> Headers:
    headers = Headers()
    for line in raw:
        if not line:
            continue
        if line[0] in " \t":
            # obs-fold (RFC 7230 §3.2.4): forbidden in requests since
            # 2014. We reject rather than coalesce.
            raise WireError("obs-fold header line is not allowed")
        name, sep, value = line.partition(":")
        if not sep:
            raise WireError(f"header line missing ':' (got {line!r})")
        if not name or any(ch in name for ch in " \t"):
            raise WireError(f"invalid header name {name!r}")
        headers.add(name, value.strip())
    return headers


def _decide_framing(headers: Headers) -> tuple[int | None, bool]:
    has_te = "transfer-encoding" in headers
    has_cl = "content-length" in headers
    if has_te:
        te = (headers.joined("transfer-encoding") or "").lower()
        # Chunked must be the final coding (RFC 7230 §3.3.1). Any other
        # codings before it are allowed; we don't decode them.
        codings = [c.strip() for c in te.split(",") if c.strip()]
        if not codings or codings[-1] != "chunked":
            raise WireError("Transfer-Encoding without final 'chunked'")
        if has_cl:
            # Smuggling guard: TE wins; CL must be removed before forwarding.
            headers.delete("content-length")
        return None, True
    if has_cl:
        cl_text = headers.joined("content-length") or ""
        try:
            cl = int(cl_text)
        except ValueError as exc:
            raise WireError(f"invalid Content-Length {cl_text!r}") from exc
        if cl < 0:
            raise WireError("negative Content-Length")
        return cl, False
    return 0, False
