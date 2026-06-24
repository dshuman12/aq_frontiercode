"""Smoke tests for the CLI."""

from __future__ import annotations

import io
from contextlib import redirect_stderr, redirect_stdout

from bulwark.cli import main


def test_help_returns_zero() -> None:
    out = io.StringIO()
    with redirect_stdout(out):
        rc = main(["--help"])
    assert rc == 0
    assert "usage" in out.getvalue()


def test_version_prints_version_string() -> None:
    out = io.StringIO()
    with redirect_stdout(out):
        rc = main(["version"])
    assert rc == 0
    assert out.getvalue().startswith("bulwark ")


def test_unknown_command_exits_two() -> None:
    err = io.StringIO()
    with redirect_stderr(err), redirect_stdout(io.StringIO()):
        rc = main(["nope"])
    assert rc == 2
    assert "unknown command" in err.getvalue()


def test_check_missing_file_is_error() -> None:
    err = io.StringIO()
    with redirect_stderr(err):
        rc = main(["check"])
    assert rc == 2
    assert "missing FILE" in err.getvalue()


def test_check_ok_on_good_input(tmp_path) -> None:
    f = tmp_path / "x.cdn"
    f.write_text("phase pre_route { rule r { when true then allow() } }")
    out = io.StringIO()
    with redirect_stdout(out):
        rc = main(["check", str(f)])
    assert rc == 0
    assert "ok" in out.getvalue()


def test_check_reports_parse_error(tmp_path) -> None:
    f = tmp_path / "x.cdn"
    f.write_text("phase pre_route { rule r { when ??? } }")
    err = io.StringIO()
    with redirect_stderr(err), redirect_stdout(io.StringIO()):
        rc = main(["check", str(f)])
    assert rc == 1
    assert "error" in err.getvalue()


def test_fmt_writes_canonical_output(tmp_path) -> None:
    f = tmp_path / "x.cdn"
    f.write_text(
        "phase pre_route{rule r{when true then allow(    )}}"
    )
    out = io.StringIO()
    with redirect_stdout(out):
        rc = main(["fmt", str(f)])
    assert rc == 0
    body = out.getvalue()
    assert "phase pre_route {" in body
    assert "rule r {" in body
