"""Source spans.

Spans are byte offsets into the original source. Line/column are
computed lazily from the source text when a diagnostic is rendered --
keeping the token stream cheap and 8-byte-per-span.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Span:
    """Half-open byte range [start, end) into a source buffer."""

    start: int
    end: int

    def __post_init__(self) -> None:
        if self.start < 0 or self.end < self.start:
            raise ValueError(f"invalid span: [{self.start}, {self.end})")

    def __len__(self) -> int:
        return self.end - self.start

    def merge(self, other: "Span") -> "Span":
        """Smallest span that covers both ``self`` and ``other``."""
        return Span(min(self.start, other.start), max(self.end, other.end))

    def slice(self, source: str) -> str:
        return source[self.start : self.end]


def line_col(source: str, offset: int) -> tuple[int, int]:
    """Return 1-based (line, column) for a byte offset.

    Column is a 1-based count of unicode code points on the line, not
    bytes. We compute it from scratch each call; spans are emitted often
    but rendered rarely, so the asymmetric cost is intentional.
    """
    if offset < 0 or offset > len(source):
        raise ValueError(f"offset {offset} out of range [0, {len(source)}]")
    line = 1
    last_nl = -1
    for i in range(offset):
        if source[i] == "\n":
            line += 1
            last_nl = i
    col = offset - last_nl
    return line, col
