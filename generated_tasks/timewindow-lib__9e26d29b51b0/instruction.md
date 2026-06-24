# Task description

Add compact duration string parsing to the library so callers can convert human-friendly durations into numeric values and back. Create two new modules:

`timewindow/exceptions.py` must define a `ParseError` exception (subclassing `Exception`) raised when a duration string cannot be interpreted.

`timewindow/duration.py` must expose four functions:

- `parse_duration_to_seconds(text: str) -> float` parses compact duration strings built from `h`, `m`, `s`, and `ms` unit components. It supports single components (`"1h"` → `3600`, `"45s"` → `45`, `"250ms"` → `0.25`), compound forms without spaces (`"1h30m"` → `5400`), surrounding/internal whitespace (`"  1h  15m  "` → `4500`), and fractional values (`"1.5h"` → `5400`). Empty strings and unrecognized fragments (e.g. `"12x"`) raise `ParseError`.
- `parse_duration_to_nanoseconds(text: str) -> int` returns the duration as integer nanoseconds (`"500ms"` → `500_000_000`).
- `duration_seconds_to_bucket_width(text: str) -> int` parses then returns an integer second count, raising `ParseError` when the result is not a whole number of seconds (`"250ms"`).
- `format_duration_seconds(seconds: float) -> str` renders a numeric second count back to a compact string (`90` → `"90s"`, `3600` → `"1h"`, `0` → `"0s"`, sub-second values end in `"s"` or `"ms"`). Negative input raises `ValueError`.

Keep `timewindow/bucket.py` and existing exports unchanged.

# Test guidelines

Run `pytest` to validate. Tests live in `tests/`; cover unit components, compound and whitespace-tolerant parsing, fractional values, nanosecond conversion, integer-second bucket widths, formatting round-trips, and the `ParseError`/`ValueError` rejection paths. Add or extend tests when introducing new behavior to guard against regressions.

# Lint guidelines

Keep code typed and compatible with Python 3.11+. Match the existing `from __future__ import annotations` style and standard-library-only approach; do not add new dependencies.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
