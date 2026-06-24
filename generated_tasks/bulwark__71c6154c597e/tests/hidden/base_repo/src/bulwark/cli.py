"""Skeletal CLI.

Subcommands:

* ``bulwark check FILE`` -- lex + parse a ruleset, print diagnostics.
* ``bulwark fmt FILE``   -- pretty-print a ruleset to stdout.
* ``bulwark serve ...``  -- not implemented yet.
* ``bulwark version``    -- print the package version.
"""

from __future__ import annotations

import sys
from pathlib import Path

from bulwark import __version__
from bulwark.errors import BulwarkError, Diagnostic, RuleError
from bulwark.formatter import format_program
from bulwark.parser import parse


_USAGE = """\
bulwark -- HTTP filtering reverse-proxy

usage:
  bulwark serve   --rules FILE [--upstream URL] [--listen ADDR]
  bulwark check   FILE
  bulwark fmt     FILE
  bulwark version

Run `bulwark <subcommand> --help` for details.
"""


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if not args or args[0] in {"-h", "--help", "help"}:
        sys.stdout.write(_USAGE)
        return 0
    cmd = args[0]
    if cmd == "version":
        sys.stdout.write(f"bulwark {__version__}\n")
        return 0
    if cmd == "check":
        return _cmd_check(args[1:])
    if cmd == "fmt":
        return _cmd_fmt(args[1:])
    if cmd == "serve":
        sys.stderr.write("bulwark: 'serve' is not implemented yet\n")
        return 2
    sys.stderr.write(f"bulwark: unknown command {cmd!r}\n")
    sys.stderr.write(_USAGE)
    return 2


def _read_source(path_arg: str) -> tuple[str, str]:
    if path_arg == "-":
        return sys.stdin.read(), "<stdin>"
    p = Path(path_arg)
    return p.read_text(encoding="utf-8"), str(p)


def _cmd_check(rest: list[str]) -> int:
    if not rest:
        sys.stderr.write("bulwark check: missing FILE\n")
        return 2
    src, name = _read_source(rest[0])
    try:
        parse(src)
    except RuleError as e:
        diag = Diagnostic(message=e.message, span=e.span)
        sys.stderr.write(diag.render(src, filename=name) + "\n")
        return 1
    except BulwarkError as e:
        sys.stderr.write(f"{name}: error: {e}\n")
        return 1
    sys.stdout.write(f"{name}: ok\n")
    return 0


def _cmd_fmt(rest: list[str]) -> int:
    if not rest:
        sys.stderr.write("bulwark fmt: missing FILE\n")
        return 2
    src, name = _read_source(rest[0])
    try:
        prog = parse(src)
    except RuleError as e:
        diag = Diagnostic(message=e.message, span=e.span)
        sys.stderr.write(diag.render(src, filename=name) + "\n")
        return 1
    sys.stdout.write(format_program(prog))
    return 0
