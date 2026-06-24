# Design notes

## Why a single binary

kindling is intended to be drop-in deployable on hosts that already
run a logging pipeline. A single statically-linked binary avoids
conflicts with the host's system tooling.

## Why no runtime dependencies

The crate depends only on the Go standard library. Adding a runtime
dependency requires maintainer sign-off; the trade-off is that
kindling re-implements a small JSON parser, regex engine, and tiny
HTTP server, but each is well-tested.

## Why the index sits in memory

For typical input sizes (a few GiB at most) an in-memory inverted
index is the simplest correct design. Beyond that scale users should
reach for a proper log-streaming product instead.

## Why three render adapters

Operators frequently need the same data in different shapes:
- `text` for terminal use,
- `json`/`csv` for piping into other tools,
- `html` for sharing a link with a teammate.
