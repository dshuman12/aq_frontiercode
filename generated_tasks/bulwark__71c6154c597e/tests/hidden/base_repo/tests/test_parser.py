"""Tests for the rule-DSL parser."""

from __future__ import annotations

import pytest

from bulwark.ast_nodes import (
    Action,
    Binary,
    BoolLit,
    Call,
    IntLit,
    Path,
    Phase,
    Program,
    RegexLit,
    Rule,
    StringLit,
    Unary,
)
from bulwark.errors import ParseError
from bulwark.parser import parse


def _one_rule(prog: Program) -> Rule:
    assert len(prog.phases) == 1
    assert len(prog.phases[0].rules) == 1
    return prog.phases[0].rules[0]


def test_smallest_program() -> None:
    src = "phase pre_route { rule r { when true then allow() } }"
    prog = parse(src)
    assert isinstance(prog, Program)
    assert prog.phases[0].name == "pre_route"
    rule = _one_rule(prog)
    assert rule.name == "r"
    assert isinstance(rule.when, BoolLit) and rule.when.value is True
    assert isinstance(rule.then, Action)
    assert rule.then.name == "allow"


def test_path_expression() -> None:
    src = 'phase pre_route { rule r { when path == "/admin" then block() } }'
    rule = _one_rule(parse(src))
    when = rule.when
    assert isinstance(when, Binary) and when.op == "=="
    assert isinstance(when.left, Path)
    assert when.left.parts == ("path",)
    assert isinstance(when.right, StringLit) and when.right.value == "/admin"


def test_dotted_path() -> None:
    src = (
        'phase pre_route { rule r { '
        'when header.x-internal == "1" then allow() } }'
    )
    rule = _one_rule(parse(src))
    when = rule.when
    assert isinstance(when, Binary)
    assert isinstance(when.left, Path)
    assert when.left.parts == ("header", "x-internal")


def test_logical_precedence() -> None:
    src = (
        "phase pre_route { rule r { "
        "when path == \"/a\" and not method == \"GET\" or true then allow() } }"
    )
    rule = _one_rule(parse(src))
    # Top-level operator is `or`.
    top = rule.when
    assert isinstance(top, Binary) and top.op == "or"
    # LHS of or is `(... and not ...)`.
    assert isinstance(top.left, Binary) and top.left.op == "and"
    assert isinstance(top.left.right, Unary) and top.left.right.op == "not"


def test_regex_match() -> None:
    src = (
        'phase pre_route { rule r { '
        'when path matches /^admin/ then block() } }'
    )
    rule = _one_rule(parse(src))
    when = rule.when
    assert isinstance(when, Binary) and when.op == "matches"
    assert isinstance(when.right, RegexLit)
    assert when.right.pattern == "^admin"


def test_action_kwargs() -> None:
    src = 'phase pre_route { rule r { when true then block(status=403, reason="x") } }'
    rule = _one_rule(parse(src))
    a = rule.then
    assert a.args == ()
    names = [k for k, _ in a.kwargs]
    assert names == ["status", "reason"]
    assert isinstance(a.kwargs[0][1], IntLit) and a.kwargs[0][1].value == 403


def test_call_in_predicate() -> None:
    src = (
        'phase pre_route { rule r { '
        'when ip_in("10.0.0.0/8", ident.client_ip) then block() } }'
    )
    rule = _one_rule(parse(src))
    assert isinstance(rule.when, Call) and rule.when.name == "ip_in"
    assert len(rule.when.args) == 2


def test_positional_after_keyword_is_error() -> None:
    src = 'phase pre_route { rule r { when true then block(status=403, "oops") } }'
    with pytest.raises(ParseError):
        parse(src)


def test_unterminated_phase_raises() -> None:
    src = "phase pre_route { rule r { when true then allow() }"
    with pytest.raises(ParseError):
        parse(src)


def test_multiple_phases_and_rules() -> None:
    src = """
    phase pre_route {
        rule a { when path == "/a" then allow() }
        rule b { when path == "/b" then block() }
    }
    phase response {
        rule c { when true then tag(name="hit") }
    }
    """
    prog = parse(src)
    assert [p.name for p in prog.phases] == ["pre_route", "response"]
    assert [r.name for r in prog.phases[0].rules] == ["a", "b"]
    assert prog.phases[1].rules[0].then.name == "tag"
