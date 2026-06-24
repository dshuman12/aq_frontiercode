"""Smoke tests for the bytecode engine."""

from __future__ import annotations

from bulwark.compiler import compile_program
from bulwark.engine import Env, run_program
from bulwark.parser import parse


def _compile(src: str):
    return compile_program(parse(src))


def _env(paths: dict, **builtins) -> Env:
    return Env(paths=paths, builtins=builtins)


def test_simple_path_match() -> None:
    src = (
        'phase pre_route { rule r { '
        'when path == "/admin" then block(status=403) } }'
    )
    cp = _compile(src)
    env = _env({"path": "/admin"})
    out = run_program(cp, env)
    assert len(out["pre_route"]) == 1
    v = out["pre_route"][0]
    assert v.action == "block"
    assert v.kwargs["status"] == 403


def test_no_match_yields_no_verdict() -> None:
    src = 'phase pre_route { rule r { when path == "/admin" then block() } }'
    cp = _compile(src)
    env = _env({"path": "/index.html"})
    out = run_program(cp, env)
    assert out["pre_route"] == []


def test_logical_and() -> None:
    src = (
        'phase pre_route { rule r { '
        'when path == "/x" and header.x-token == "ok" then allow() } }'
    )
    cp = _compile(src)
    env_yes = _env({"path": "/x", "header.x-token": "ok"})
    env_no = _env({"path": "/x", "header.x-token": "no"})
    assert run_program(cp, env_yes)["pre_route"][0].action == "allow"
    assert run_program(cp, env_no)["pre_route"] == []


def test_logical_or_short_circuit() -> None:
    src = (
        'phase pre_route { rule r { '
        'when path == "/a" or path == "/b" then tag(name="hit") } }'
    )
    cp = _compile(src)
    assert run_program(cp, _env({"path": "/a"}))["pre_route"][0].action == "tag"
    assert run_program(cp, _env({"path": "/b"}))["pre_route"][0].action == "tag"
    assert run_program(cp, _env({"path": "/c"}))["pre_route"] == []


def test_regex_match() -> None:
    src = (
        'phase pre_route { rule r { '
        'when path matches /^.admin/ then block(status=403) } }'
    )
    cp = _compile(src)
    out = run_program(cp, _env({"path": "/admin/users"}))
    assert out["pre_route"][0].action == "block"
    out = run_program(cp, _env({"path": "/api"}))
    assert out["pre_route"] == []


def test_in_list() -> None:
    src = (
        'phase pre_route { rule r { '
        'when method in ["POST", "PUT"] then tag(name="write") } }'
    )
    cp = _compile(src)
    assert run_program(cp, _env({"method": "POST"}))["pre_route"][0].action == "tag"
    assert run_program(cp, _env({"method": "GET"}))["pre_route"] == []


def test_builtin_call() -> None:
    src = (
        'phase pre_route { rule r { '
        'when starts_with(path, "/api/") then allow() } }'
    )
    cp = _compile(src)

    def starts_with(haystack: str, needle: str) -> bool:
        return isinstance(haystack, str) and haystack.startswith(needle)

    env = Env(paths={"path": "/api/v1/users"}, builtins={"starts_with": starts_with})
    out = run_program(cp, env)
    assert out["pre_route"][0].action == "allow"
