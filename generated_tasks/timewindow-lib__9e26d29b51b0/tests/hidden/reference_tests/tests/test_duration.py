import pytest

from timewindow.duration import (
    duration_seconds_to_bucket_width,
    format_duration_seconds,
    parse_duration_to_nanoseconds,
    parse_duration_to_seconds,
)
from timewindow.exceptions import ParseError


def test_parse_single_components():
    assert parse_duration_to_seconds("1h") == 3600
    assert parse_duration_to_seconds("30m") == 1800
    assert parse_duration_to_seconds("45s") == 45
    assert parse_duration_to_seconds("250ms") == 0.25


def test_parse_compound_without_spaces():
    assert parse_duration_to_seconds("1h30m") == 5400


def test_parse_compound_with_spaces():
    assert parse_duration_to_seconds("  1h  15m  ") == 4500


def test_parse_fractional_hours():
    assert abs(parse_duration_to_seconds("1.5h") - 5400) < 1e-6


def test_parse_nanoseconds_round_trip():
    ns = parse_duration_to_nanoseconds("500ms")
    assert ns == 500_000_000


def test_parse_rejects_empty():
    with pytest.raises(ParseError):
        parse_duration_to_seconds("")


def test_parse_rejects_garbage_fragment():
    with pytest.raises(ParseError):
        parse_duration_to_seconds("12x")


def test_bucket_width_requires_integer_seconds():
    assert duration_seconds_to_bucket_width("90s") == 90
    with pytest.raises(ParseError):
        duration_seconds_to_bucket_width("250ms")


def test_format_whole_seconds():
    assert format_duration_seconds(90) == "90s"
    assert format_duration_seconds(3600) == "1h"


def test_format_subsecond():
    text = format_duration_seconds(0.25)
    assert text.endswith("ms") or text.endswith("s")


def test_format_zero():
    assert format_duration_seconds(0) == "0s"


def test_format_rejects_negative():
    with pytest.raises(ValueError):
        format_duration_seconds(-1)
