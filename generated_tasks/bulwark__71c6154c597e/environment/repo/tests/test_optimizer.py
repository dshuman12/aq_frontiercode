"""Tests for the optimizer (constant folding, rule dedup)."""

from __future__ import annotations

from bulwark.ast_nodes import BoolLit, Binary, Path, Unary
from bulwark.optimizer import fold, optimize
from bulwark.parser import parse


def _when(src: str):
    prog = parse(src)
    return prog.phases[0].rules[0].when


def test_double_negation_elimination() -> None:
    e = _when(
        'phase pre_route { rule r { when not not path == "/" then allow() } }'
    )
    folded = fold(e)
    assert isinstance(folded, Binary)
    assert folded.op == "=="


def test_and_with_false_short_circuits() -> None:
    e = _when(
        'phase pre_route { rule r { when false and path == "/" then allow() } }'
    )
    folded = fold(e)
    assert isinstance(folded, BoolLit) and folded.value is False


def test_and_with_true_passes_through() -> None:
    e = _when(
        'phase pre_route { rule r { when true and path == "/" then allow() } }'
    )
    folded = fold(e)
    assert isinstance(folded, Binary) and folded.op == "=="


def test_or_with_true_short_circuits() -> None:
    e = _when(
        'phase pre_route { rule r { when true or path == "/" then allow() } }'
    )
    folded = fold(e)
    assert isinstance(folded, BoolLit) and folded.value is True


def test_dedupe_identical_rules() -> None:
    src = """
    phase pre_route {
        rule a { when path == "/admin" then block(status=403) }
        rule b { when path == "/admin" then block(status=403) }
    }
    """
    prog = optimize(parse(src))
    assert len(prog.phases[0].rules) == 1
    assert prog.phases[0].rules[0].name == "a"


def test_does_not_dedupe_when_actions_differ() -> None:
    src = """
    phase pre_route {
        rule a { when path == "/admin" then block(status=403) }
        rule b { when path == "/admin" then tag(name="admin") }
    }
    """
    prog = optimize(parse(src))
    assert len(prog.phases[0].rules) == 2


def test_optimize_preserves_path_predicate() -> None:
    src = (
        'phase pre_route { rule r { '
        'when not not path == "/" then allow() } }'
    )
    prog = optimize(parse(src))
    when = prog.phases[0].rules[0].when
    assert isinstance(when, Binary)
    assert isinstance(when.left, Path)
