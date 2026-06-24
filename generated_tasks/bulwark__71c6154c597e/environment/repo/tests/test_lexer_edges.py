"""Tests focused on lexer edge cases."""

from __future__ import annotations

import pytest

from bulwark.errors import LexError
from bulwark.lexer import is_keyword, tokenize
from bulwark.tokens import Tok


def test_utf8_inside_string_literal_is_preserved() -> None:
    src = '"héllo wörld 🌍"'
    (tok, _eof) = tokenize(src)
    assert tok.kind is Tok.STRING
    assert tok.value == "héllo wörld 🌍"


def test_carriage_return_is_treated_as_whitespace() -> None:
    src = "phase\r\nx\r\n{\r\n}"
    kinds = [t.kind for t in tokenize(src)]
    assert kinds == [Tok.IDENT, Tok.IDENT, Tok.LBRACE, Tok.RBRACE, Tok.EOF]


def test_comment_at_eof_without_newline() -> None:
    toks = tokenize("phase x # trailing")
    assert toks[0].value == "phase"
    assert toks[1].value == "x"
    assert toks[-1].kind is Tok.EOF


def test_consecutive_punctuation_separated() -> None:
    toks = tokenize("([{}])")
    assert [t.kind for t in toks] == [
        Tok.LPAREN,
        Tok.LBRACK,
        Tok.LBRACE,
        Tok.RBRACE,
        Tok.RBRACK,
        Tok.RPAREN,
        Tok.EOF,
    ]


def test_unknown_escape_sequence_in_string() -> None:
    with pytest.raises(LexError):
        tokenize(r'"\q"')


def test_is_keyword() -> None:
    assert is_keyword("phase")
    assert is_keyword("when")
    assert not is_keyword("phase_pre_route")
    assert not is_keyword("x")


def test_short_regex_literal() -> None:
    toks = tokenize("/x/")
    assert toks[0].kind is Tok.REGEX
    assert toks[0].value == "x"


def test_minus_outside_identifier_is_an_error() -> None:
    # We don't have arithmetic, so a bare `-` is not a valid token.
    with pytest.raises(LexError):
        tokenize("-5")
