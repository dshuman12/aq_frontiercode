"""Tests for the semantic checker."""

from __future__ import annotations

from bulwark.parser import parse
from bulwark.semcheck import check


def _diags(src: str) -> list[str]:
    res = check(parse(src))
    return [d.message for d in res.diagnostics]


def test_clean_program_has_no_diagnostics() -> None:
    src = (
        'phase pre_route { '
        'rule r { when path == "/admin" then block(status=403) } '
        '}'
    )
    assert _diags(src) == []


def test_unknown_phase_name_is_an_error() -> None:
    src = "phase nope { rule r { when true then allow() } }"
    msgs = _diags(src)
    assert any("unknown phase" in m for m in msgs)


def test_unknown_action_is_an_error() -> None:
    src = "phase pre_route { rule r { when true then warp() } }"
    msgs = _diags(src)
    assert any("unknown action" in m for m in msgs)


def test_unknown_path_root_is_an_error() -> None:
    src = 'phase pre_route { rule r { when foo.bar == "x" then allow() } }'
    msgs = _diags(src)
    assert any("unknown path root" in m for m in msgs)


def test_predicate_must_be_bool() -> None:
    src = 'phase pre_route { rule r { when "x" then allow() } }'
    msgs = _diags(src)
    assert any("must be bool" in m for m in msgs)


def test_arity_check_on_builtin() -> None:
    src = (
        'phase pre_route { rule r { when len(path, "x") == 0 then allow() } }'
    )
    msgs = _diags(src)
    assert any("expects 1 args" in m for m in msgs)


def test_matches_rhs_must_be_regex_literal() -> None:
    src = 'phase pre_route { rule r { when path matches "x" then allow() } }'
    msgs = _diags(src)
    assert any("must be a regex" in m for m in msgs)


def test_in_rhs_must_be_list() -> None:
    src = 'phase pre_route { rule r { when ident.client_ip in "x" then allow() } }'
    msgs = _diags(src)
    assert any("must be a list" in m for m in msgs)


def test_action_kwarg_type_mismatch() -> None:
    src = (
        'phase pre_route { rule r { '
        'when true then block(status="oops") } }'
    )
    msgs = _diags(src)
    assert any("status" in m and "expected int" in m for m in msgs)


def test_duplicate_rule_name() -> None:
    src = """
    phase pre_route {
        rule r { when true then allow() }
        rule r { when false then block() }
    }
    """
    msgs = _diags(src)
    assert any("duplicate rule" in m for m in msgs)


def test_repeated_phase_is_a_warning() -> None:
    src = """
    phase pre_route { rule a { when true then allow() } }
    phase pre_route { rule b { when true then allow() } }
    """
    res = check(parse(src))
    assert any(d.severity == "warning" for d in res.diagnostics)
    assert res.ok  # warnings don't fail the check
