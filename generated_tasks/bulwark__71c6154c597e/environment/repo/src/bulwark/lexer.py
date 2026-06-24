"""Hand-rolled lexer for the bulwark rule DSL.

The lexer is intentionally simple:

* one pass, one character of lookahead
* no regex engine -- we want predictable spans and useful error messages
* utf-8 source is allowed inside string and regex literals; identifiers
  are ASCII only (it's a config language, not a programming language)

This module emits tokens; nothing here makes decisions about whether a
sequence of tokens is well-formed. That's the parser's job.
"""

from __future__ import annotations

from bulwark.errors import LexError
from bulwark.span import Span
from bulwark.tokens import Tok, Token


def tokenize(source: str) -> list[Token]:
    """Lex ``source`` into a list of tokens, ending in ``Tok.EOF``."""
    lx = _Lexer(source)
    out: list[Token] = []
    while True:
        tok = lx.next_token()
        out.append(tok)
        if tok.kind is Tok.EOF:
            break
    return out


class _Lexer:
    __slots__ = ("src", "pos", "n")

    def __init__(self, source: str) -> None:
        self.src = source
        self.pos = 0
        self.n = len(source)

    # ---- low-level helpers ------------------------------------------------

    def _peek(self, offset: int = 0) -> str:
        i = self.pos + offset
        return self.src[i] if i < self.n else ""

    def _advance(self) -> str:
        ch = self.src[self.pos]
        self.pos += 1
        return ch

    def _span(self, start: int) -> Span:
        return Span(start, self.pos)

    # ---- top-level dispatch ----------------------------------------------

    def next_token(self) -> Token:
        self._skip_whitespace_and_comments()
        if self.pos >= self.n:
            return Token(Tok.EOF, Span(self.n, self.n))

        start = self.pos
        ch = self._peek()

        # A `/` starts a regex literal only when it can't be the start
        # of a comment or arithmetic. We don't have arithmetic, and `#`
        # starts comments. So a `/` always starts a regex.
        if ch == "/":
            return self._regex(start)

        if ch.isdigit():
            return self._number(start)

        if ch == '"':
            return self._string(start)

        if ch.isalpha() or ch == "_":
            return self._ident(start)

        return self._punct(start)

    # ---- whitespace / comments -------------------------------------------

    def _skip_whitespace_and_comments(self) -> None:
        while self.pos < self.n:
            ch = self.src[self.pos]
            if ch in " \t\r\n":
                self.pos += 1
            elif ch == "#":
                # Line comment to end of line.
                while self.pos < self.n and self.src[self.pos] != "\n":
                    self.pos += 1
            else:
                return

    # ---- literals --------------------------------------------------------

    def _number(self, start: int) -> Token:
        is_float = False
        while self.pos < self.n and self.src[self.pos].isdigit():
            self.pos += 1
        if self._peek() == "." and self._peek(1).isdigit():
            is_float = True
            self.pos += 1
            while self.pos < self.n and self.src[self.pos].isdigit():
                self.pos += 1
        text = self.src[start : self.pos]
        if is_float:
            return Token(Tok.FLOAT, self._span(start), float(text))
        return Token(Tok.INT, self._span(start), int(text))

    def _string(self, start: int) -> Token:
        self._advance()  # opening "
        chunks: list[str] = []
        while True:
            if self.pos >= self.n:
                raise LexError("unterminated string literal", self._span(start))
            ch = self._advance()
            if ch == '"':
                break
            if ch == "\\":
                if self.pos >= self.n:
                    raise LexError(
                        "trailing backslash in string", self._span(start)
                    )
                esc = self._advance()
                chunks.append(_unescape(esc, self._span(start)))
            else:
                chunks.append(ch)
        return Token(Tok.STRING, self._span(start), "".join(chunks))

    def _regex(self, start: int) -> Token:
        # /^.../  -- anchored at the start. We require the leading ^ as a
        # readability rule; rules that need a non-anchored match should
        # use ``contains`` (parsed later as a builtin atom).
        self._advance()  # /
        chunks: list[str] = []
        while True:
            if self.pos >= self.n:
                raise LexError("unterminated regex literal", self._span(start))
            ch = self._advance()
            if ch == "/":
                break
            if ch == "\\":
                if self.pos >= self.n:
                    raise LexError(
                        "trailing backslash in regex", self._span(start)
                    )
                # Preserve the escape verbatim -- the regex compiler will
                # see it.
                chunks.append("\\" + self._advance())
            else:
                chunks.append(ch)
        return Token(Tok.REGEX, self._span(start), "".join(chunks))

    def _ident(self, start: int) -> Token:
        while self.pos < self.n:
            ch = self.src[self.pos]
            if ch.isalnum() or ch in "_-":
                self.pos += 1
            else:
                break
        return Token(Tok.IDENT, self._span(start), self.src[start : self.pos])

    # ---- punctuation -----------------------------------------------------

    def _punct(self, start: int) -> Token:
        ch = self._advance()
        nx = self._peek()

        if ch == "=" and nx == "=":
            self.pos += 1
            return Token(Tok.EQEQ, self._span(start))
        if ch == "!" and nx == "=":
            self.pos += 1
            return Token(Tok.NEQ, self._span(start))
        if ch == "<" and nx == "=":
            self.pos += 1
            return Token(Tok.LE, self._span(start))
        if ch == ">" and nx == "=":
            self.pos += 1
            return Token(Tok.GE, self._span(start))
        if ch == "=" and nx == "~":
            self.pos += 1
            return Token(Tok.MATCHES, self._span(start))

        single = {
            "(": Tok.LPAREN,
            ")": Tok.RPAREN,
            "{": Tok.LBRACE,
            "}": Tok.RBRACE,
            "[": Tok.LBRACK,
            "]": Tok.RBRACK,
            ",": Tok.COMMA,
            ".": Tok.DOT,
            ":": Tok.COLON,
            ";": Tok.SEMI,
            "=": Tok.EQ,
            "<": Tok.LT,
            ">": Tok.GT,
        }
        if ch in single:
            return Token(single[ch], self._span(start))

        raise LexError(f"unexpected character {ch!r}", self._span(start))


_SIMPLE_ESCAPES = {
    '"': '"',
    "\\": "\\",
    "n": "\n",
    "t": "\t",
    "r": "\r",
    "0": "\0",
}


def _unescape(esc: str, span: Span) -> str:
    if esc in _SIMPLE_ESCAPES:
        return _SIMPLE_ESCAPES[esc]
    raise LexError(f"unknown escape sequence \\{esc}", span)


def is_keyword(word: str) -> bool:
    """Return True if ``word`` is a reserved keyword in the rule DSL.

    Exposed as a helper so the parser doesn't have to import the
    ``KEYWORDS`` constant directly. Also useful when you want to ask
    "is this identifier eligible to be a path root?".
    """
    from bulwark.tokens import KEYWORDS

    return word in KEYWORDS
