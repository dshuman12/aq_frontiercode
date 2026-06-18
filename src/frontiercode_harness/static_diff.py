"""
static_diff — step 4c: inspect the LLM's proposed diff WITHOUT running anything.

This is the cheap front gate of the guardrail. It rejects an adaptation when the
diff does more than rename/restring, so the expensive test runs (4a/4b) only ever
see plausibly-honest adaptations. It cannot prove behavioral faithfulness on its
own (that's what 4b is for) — but it catches the blatant assertion-gutting cases
for free and is fully deterministic.

What a LEGITIMATE adaptation looks like at the diff level:
  - changed tokens are identifiers, string literals, import paths, call syntax
  - the NUMBER of assertions is unchanged
  - no comparison operator is flipped, no numeric/boolean expectation changed
  - no control flow added/removed
  - no denylisted (load-bearing) string is touched

Anything else -> reject.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class StaticDiffVerdict:
    ok: bool
    reason: str


# Lines we treat as assertion-bearing. Extend per test framework / language.
_ASSERT_RE = re.compile(
    r"\b(assert\w*|EXPECT_\w+|ASSERT_\w+|require|CHECK\w*)\b"
)
# Comparison / logical operators whose change is a behavioral edit, not cosmetic.
_OP_RE = re.compile(r"(==|!=|<=|>=|&&|\|\||\bnot\b|<|>)")
# Numeric or boolean literals on a changed line => changed expectation.
_VALUE_RE = re.compile(r"\b(true|false|True|False|\d+(\.\d+)?)\b")
# Control-flow keywords whose add/remove is a structural edit.
_CONTROLFLOW_RE = re.compile(r"\b(if|else|for|while|switch|case|try|catch|return)\b")
# A double-quoted string literal.
_STRING_RE = re.compile(r"\"(?:[^\"\\]|\\.)*\"")


class StaticDiffChecker:
    def inspect(self, diff: str, contract) -> StaticDiffVerdict:
        added, removed = _split_changes(diff)

        # 1. Assertion count must be preserved.
        if _count(added, _ASSERT_RE) != _count(removed, _ASSERT_RE):
            return StaticDiffVerdict(False, "assertion count changed")

        # 2. No comparison/logical operator may be flipped.
        if _multiset(added, _OP_RE) != _multiset(removed, _OP_RE):
            return StaticDiffVerdict(False, "comparison/logical operator changed")

        # 3. No numeric/boolean expected value may change.
        if _multiset(added, _VALUE_RE) != _multiset(removed, _VALUE_RE):
            return StaticDiffVerdict(False, "numeric/boolean expectation changed")

        # 4. No control-flow keyword added or removed.
        if _multiset(added, _CONTROLFLOW_RE) != _multiset(removed, _CONTROLFLOW_RE):
            return StaticDiffVerdict(False, "control flow changed")

        # 5. Denylisted (load-bearing) strings must not be touched.
        touched_strings = set(_findall(added, _STRING_RE)) | set(
            _findall(removed, _STRING_RE)
        )
        for s in getattr(contract, "denied_string_literals", ()):
            quoted = f'"{s}"'
            if quoted in touched_strings or any(s in t for t in touched_strings):
                return StaticDiffVerdict(
                    False, f"touched load-bearing string: {s!r}"
                )

        # 6. After accounting for renamed identifiers and re-worded strings,
        #    nothing structural should remain. We approximate this by checking
        #    that every changed line, with strings+identifiers masked, is equal
        #    to its counterpart. A perfect version of this is an AST diff; see
        #    note below.
        residual = _structural_residual(added, removed)
        if residual:
            return StaticDiffVerdict(
                False, f"non-cosmetic change remains: {residual[:120]}"
            )

        return StaticDiffVerdict(True, "diff is rename/restring only")


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #

def _split_changes(diff: str) -> tuple[list[str], list[str]]:
    added, removed = [], []
    for line in diff.splitlines():
        if line.startswith("+++") or line.startswith("---") or line.startswith("@@"):
            continue
        if line.startswith("+"):
            added.append(line[1:])
        elif line.startswith("-"):
            removed.append(line[1:])
    return added, removed


def _count(lines: list[str], rx: re.Pattern) -> int:
    return sum(len(rx.findall(l)) for l in lines)


def _multiset(lines: list[str], rx: re.Pattern):
    from collections import Counter
    c: Counter = Counter()
    for l in lines:
        c.update(m if isinstance(m, str) else m[0] for m in rx.findall(l))
    return c


def _findall(lines: list[str], rx: re.Pattern) -> list[str]:
    out = []
    for l in lines:
        out.extend(rx.findall(l))
    return out


def _structural_residual(added: list[str], removed: list[str]) -> str:
    """
    Mask out strings and identifiers, normalize whitespace, and check that the
    *shape* of added vs removed lines matches. Returns "" when only cosmetic
    tokens differ, else a sample of the offending normalized line.

    This is a heuristic. For production, prefer a real AST diff per language:
    parse both versions, substitute the renamed identifiers, and assert the
    trees are otherwise identical. The token mask below is the fast fallback.
    """
    def normalize(line: str) -> str:
        line = _STRING_RE.sub('"S"', line)              # mask strings
        line = re.sub(r"[A-Za-z_]\w*", "ID", line)      # mask identifiers
        line = re.sub(r"\s+", "", line)                 # ignore whitespace
        return line

    add_shapes = sorted(normalize(l) for l in added if l.strip())
    rem_shapes = sorted(normalize(l) for l in removed if l.strip())
    if add_shapes == rem_shapes:
        return ""
    # find the first added shape that has no matching removed shape
    rem_pool = list(rem_shapes)
    for s in add_shapes:
        if s in rem_pool:
            rem_pool.remove(s)
        else:
            return s
    return rem_pool[0] if rem_pool else ""
