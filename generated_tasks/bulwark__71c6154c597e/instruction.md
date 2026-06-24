# Task description

Add a streaming HTTP/1.1 chunked Transfer-Encoding decoder in a new module `src/bulwark/chunked.py`. The decoder must consume arbitrarily fragmented input and yield decoded body bytes incrementally, supporting chunk extensions, trailers, and a configurable body cap.

Provide a `ChunkError` exception (subclass of `BulwarkError` from `bulwark.errors`) and a `ChunkedDecoder` class with this contract:

- `ChunkedDecoder(max_body: int = 16 << 20)` constructs a decoder with a maximum cumulative decoded-body size.
- `feed(data: bytes)` accepts a chunk of raw input and returns an iterable of decoded body byte pieces. It must tolerate input split at any byte boundary, buffering partial chunk headers, data, and CRLFs across calls.
- `done` is a bool that becomes `True` once the terminating zero-size chunk and final CRLF have been consumed.
- `trailers` exposes parsed trailer headers via the case-insensitive `Headers` map (`bulwark.headers.Headers`), looked up with `.get(name)` returning the value or `None`.

Required parsing behavior:

- Chunk size is hex; a chunk line may carry `;`-delimited extensions which are ignored.
- Each chunk's data must be followed by CRLF; missing/incorrect data CRLF is an error.
- A zero-size chunk ends the body; trailer lines up to the final blank line are collected.
- Reject negative sizes, non-hex sizes, obs-fold (leading whitespace) trailer lines, and any decoded body exceeding `max_body`, by raising `ChunkError`.

# Test guidelines

The test suite lives under `tests`; add a focused module there exercising basic and multi-chunk bodies, ignored extensions, trailer collection, byte-at-a-time streaming, the body cap, and each rejection path. Run `pytest`. Note `filterwarnings = ["error"]` is enabled, so emit no warnings.

# Lint guidelines

Run `make lint` (`python -m compileall -q src tests`); it must report no errors.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch. Follow the surrounding code's typed, `from __future__ import annotations` style and keep the decoder pure (no I/O).
