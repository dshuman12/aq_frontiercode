"""Round-trip and shape tests for the formatter."""

from __future__ import annotations

from bulwark.formatter import format_program
from bulwark.parser import parse


def _round_trip(src: str) -> tuple[str, str]:
    once = format_program(parse(src))
    twice = format_program(parse(once))
    return once, twice


def test_formatter_round_trip_minimal() -> None:
    src = "phase pre_route { rule r { when true then allow() } }"
    once, twice = _round_trip(src)
    assert once == twice


def test_formatter_round_trip_complex() -> None:
    src = """
    phase pre_route {
      rule a {
        when path matches /^admin/ and not header.x-token == "ok" then block(status=403)
      }
      rule b {
        when ident.client_ip in ["10.0.0.0/8", "192.168.0.0/16"] then tag(name="lan")
      }
    }
    """
    once, twice = _round_trip(src)
    assert once == twice


def test_formatter_paren_for_lower_precedence() -> None:
    src = (
        'phase x { rule r { when (true or false) and true then allow() } }'
    )
    once = format_program(parse(src))
    # The inner `or` is lower precedence than `and`, so it must be parenthesized.
    assert "(true or false) and true" in once


def test_formatter_normalizes_string_escapes() -> None:
    src = 'phase x { rule r { when path == "a\\nb" then allow() } }'
    once = format_program(parse(src))
    assert '"a\\nb"' in once


def test_formatter_empty_phase() -> None:
    once = format_program(parse("phase x {}"))
    assert once == "phase x {}\n"
