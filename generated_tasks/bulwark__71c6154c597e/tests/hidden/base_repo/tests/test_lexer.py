"""Smoke tests for the lexer skeleton."""

from __future__ import annotations

import pytest

from bulwark.errors import LexError
from bulwark.lexer import tokenize
from bulwark.tokens import Tok


def kinds(source: str) -> list[Tok]:
    return [t.kind for t in tokenize(source)]


def test_empty_source_yields_only_eof() -> None:
    assert kinds("") == [Tok.EOF]


def test_simple_punctuation() -> None:
    assert kinds("(){},.;") == [
        Tok.LPAREN,
        Tok.RPAREN,
        Tok.LBRACE,
        Tok.RBRACE,
        Tok.COMMA,
        Tok.DOT,
        Tok.SEMI,
        Tok.EOF,
    ]


def test_two_char_operators() -> None:
    assert kinds("== != <= >= =~") == [
        Tok.EQEQ,
        Tok.NEQ,
        Tok.LE,
        Tok.GE,
        Tok.MATCHES,
        Tok.EOF,
    ]


def test_integer_and_float_literals() -> None:
    toks = tokenize("42 3.14")
    assert toks[0].kind is Tok.INT and toks[0].value == 42
    assert toks[1].kind is Tok.FLOAT and toks[1].value == pytest.approx(3.14)


def test_string_with_escapes() -> None:
    (tok, _eof) = tokenize(r'"a\nb\"c"')
    assert tok.kind is Tok.STRING
    assert tok.value == 'a\nb"c'


def test_regex_literal_must_anchor() -> None:
    (tok, _eof) = tokenize("/^admin/")
    assert tok.kind is Tok.REGEX
    assert tok.value == "^admin"


def test_identifiers_and_comments() -> None:
    src = "phase pre_route   # trailing\nrule x"
    toks = tokenize(src)
    assert [t.kind for t in toks] == [
        Tok.IDENT,
        Tok.IDENT,
        Tok.IDENT,
        Tok.IDENT,
        Tok.EOF,
    ]
    assert toks[0].value == "phase"
    assert toks[1].value == "pre_route"
    assert toks[2].value == "rule"
    assert toks[3].value == "x"


def test_unterminated_string_is_an_error() -> None:
    with pytest.raises(LexError):
        tokenize('"oops')


def test_unknown_character_is_an_error() -> None:
    with pytest.raises(LexError):
        tokenize("@")
