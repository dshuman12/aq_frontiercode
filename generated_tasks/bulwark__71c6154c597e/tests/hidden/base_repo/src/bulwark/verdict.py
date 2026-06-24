"""Verdict -- what a rule produced when it fired.

The engine emits a verdict per matched rule. The pipeline coalesces
verdicts within a phase by action priority (block > challenge > tag >
allow) and then applies the highest-priority verdict to the request.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping


# Priority order. Higher = more important.
ACTION_PRIORITY: dict[str, int] = {
    "allow": 1,
    "tag": 2,
    "challenge": 3,
    "block": 4,
}


@dataclass(frozen=True, slots=True)
class Verdict:
    rule: str
    phase: str
    action: str
    kwargs: Mapping[str, Any] = field(default_factory=dict)
    # Ruleset version this verdict came from. The pipeline pins one
    # version per request; the audit log carries it for replay.
    version: str = ""

    @property
    def priority(self) -> int:
        return ACTION_PRIORITY.get(self.action, 0)


def coalesce(verdicts: list[Verdict]) -> Verdict | None:
    """Return the highest-priority verdict, or None if there are none.

    Stable in the face of ties: the first verdict with the highest
    priority wins. Callers expect that a rule listed earlier in the
    same phase wins ties.
    """
    if not verdicts:
        return None
    best = verdicts[0]
    for v in verdicts[1:]:
        if v.priority > best.priority:
            best = v
    return best
