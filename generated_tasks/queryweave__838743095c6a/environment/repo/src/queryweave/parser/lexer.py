"""SQL-like tokenizer/lexer for QueryWeave."""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, auto
from typing import Iterator


class TokenType(Enum):
    """All recognized token types."""

    SELECT = auto()
    FROM = auto()
    WHERE = auto()
    JOIN = auto()
    ON = auto()
    GROUP_BY = auto()
    ORDER_BY = auto()
    HAVING = auto()
    LIMIT = auto()
    OFFSET = auto()
    INSERT = auto()
    UPDATE = auto()
    DELETE = auto()
    CREATE = auto()
    DROP = auto()
    AS = auto()
    AND = auto()
    OR = auto()
    NOT = auto()
    IN = auto()
    BETWEEN = auto()
    LIKE = auto()
    IS = auto()
    NULL = auto()
    TRUE = auto()
    FALSE = auto()
    CASE = auto()
    WHEN = auto()
    THEN = auto()
    ELSE = auto()
    END = auto()
    ASC = auto()
    DESC = auto()
    DISTINCT = auto()
    UNION = auto()
    ALL = auto()
    EXISTS = auto()
    INTO = auto()
    VALUES = auto()
    SET = auto()
    TABLE = auto()
    LEFT = auto()
    RIGHT = auto()
    INNER = auto()
    OUTER = auto()
    FULL = auto()
    CROSS = auto()
    BY = auto()
    ORDER = auto()
    GROUP = auto()
    OVER = auto()
    PARTITION = auto()
    ROWS = auto()
    RANGE = auto()
    UNBOUNDED = auto()
    PRECEDING = auto()
    FOLLOWING = auto()
    CURRENT = auto()
    ROW = auto()

    IDENTIFIER = auto()
    NUMBER = auto()
    FLOAT = auto()
    STRING = auto()

    OPERATOR = auto()
    LPAREN = auto()
    RPAREN = auto()
    COMMA = auto()
    DOT = auto()
    SEMICOLON = auto()
    STAR = auto()
    WILDCARD = auto()

    EOF = auto()


_KEYWORDS: dict[str, TokenType] = {
    "SELECT": TokenType.SELECT,
    "FROM": TokenType.FROM,
    "WHERE": TokenType.WHERE,
    "JOIN": TokenType.JOIN,
    "ON": TokenType.ON,
    "HAVING": TokenType.HAVING,
    "LIMIT": TokenType.LIMIT,
    "OFFSET": TokenType.OFFSET,
    "INSERT": TokenType.INSERT,
    "UPDATE": TokenType.UPDATE,
    "DELETE": TokenType.DELETE,
    "CREATE": TokenType.CREATE,
    "DROP": TokenType.DROP,
    "AS": TokenType.AS,
    "AND": TokenType.AND,
    "OR": TokenType.OR,
    "NOT": TokenType.NOT,
    "IN": TokenType.IN,
    "BETWEEN": TokenType.BETWEEN,
    "LIKE": TokenType.LIKE,
    "IS": TokenType.IS,
    "NULL": TokenType.NULL,
    "TRUE": TokenType.TRUE,
    "FALSE": TokenType.FALSE,
    "CASE": TokenType.CASE,
    "WHEN": TokenType.WHEN,
    "THEN": TokenType.THEN,
    "ELSE": TokenType.ELSE,
    "END": TokenType.END,
    "ASC": TokenType.ASC,
    "DESC": TokenType.DESC,
    "DISTINCT": TokenType.DISTINCT,
    "UNION": TokenType.UNION,
    "ALL": TokenType.ALL,
    "EXISTS": TokenType.EXISTS,
    "INTO": TokenType.INTO,
    "VALUES": TokenType.VALUES,
    "SET": TokenType.SET,
    "TABLE": TokenType.TABLE,
    "LEFT": TokenType.LEFT,
    "RIGHT": TokenType.RIGHT,
    "INNER": TokenType.INNER,
    "OUTER": TokenType.OUTER,
    "FULL": TokenType.FULL,
    "CROSS": TokenType.CROSS,
    "BY": TokenType.BY,
    "ORDER": TokenType.ORDER,
    "GROUP": TokenType.GROUP,
    "OVER": TokenType.OVER,
    "PARTITION": TokenType.PARTITION,
    "ROWS": TokenType.ROWS,
    "RANGE": TokenType.RANGE,
    "UNBOUNDED": TokenType.UNBOUNDED,
    "PRECEDING": TokenType.PRECEDING,
    "FOLLOWING": TokenType.FOLLOWING,
    "CURRENT": TokenType.CURRENT,
    "ROW": TokenType.ROW,
}

_MULTI_CHAR_OPS = {"!=", "<>", "<=", ">=", "||"}
_SINGLE_CHAR_OPS = {"+", "-", "*", "/", "%", "=", "<", ">"}


@dataclass(slots=True)
class Token:
    """A single lexer token."""

    type: TokenType
    value: str
    line: int
    col: int

    def __repr__(self) -> str:
        return f"Token({self.type.name}, {self.value!r}, L{self.line}:{self.col})"


class LexerError(Exception):
    """Raised when the lexer encounters invalid input."""

    def __init__(self, message: str, line: int, col: int) -> None:
        self.line = line
        self.col = col
        super().__init__(f"Lexer error at L{line}:{col}: {message}")


class Lexer:
    """Tokenizes a SQL-like query string."""

    def __init__(self, source: str) -> None:
        self._source = source
        self._pos = 0
        self._line = 1
        self._col = 1
        self._tokens: list[Token] = []
        self._tokenized = False

    @property
    def source(self) -> str:
        return self._source

    def tokenize(self) -> list[Token]:
        """Tokenize the entire source and return token list."""
        if self._tokenized:
            return self._tokens
        while self._pos < len(self._source):
            self._skip_whitespace_and_comments()
            if self._pos >= len(self._source):
                break
            tok = self._next_token()
            if tok is not None:
                self._tokens.append(tok)
        self._tokens.append(Token(TokenType.EOF, "", self._line, self._col))
        self._tokenized = True
        return self._tokens

    def __iter__(self) -> Iterator[Token]:
        return iter(self.tokenize())

    def _current(self) -> str:
        return self._source[self._pos]

    def _peek(self, offset: int = 1) -> str | None:
        idx = self._pos + offset
        if idx < len(self._source):
            return self._source[idx]
        return None

    def _advance(self) -> str:
        ch = self._source[self._pos]
        self._pos += 1
        if ch == "\n":
            self._line += 1
            self._col = 1
        else:
            self._col += 1
        return ch

    def _skip_whitespace_and_comments(self) -> None:
        while self._pos < len(self._source):
            ch = self._source[self._pos]
            if ch.isspace():
                self._advance()
            elif ch == "-" and self._peek() == "-":
                self._skip_line_comment()
            elif ch == "/" and self._peek() == "*":
                self._skip_block_comment()
            else:
                break

    def _skip_line_comment(self) -> None:
        while self._pos < len(self._source) and self._source[self._pos] != "\n":
            self._advance()

    def _skip_block_comment(self) -> None:
        self._advance()  # /
        self._advance()  # *
        while self._pos < len(self._source):
            if self._source[self._pos] == "*" and self._peek() == "/":
                self._advance()
                self._advance()
                return
            self._advance()
        raise LexerError("Unterminated block comment", self._line, self._col)

    def _next_token(self) -> Token | None:
        start_line = self._line
        start_col = self._col
        ch = self._current()

        if ch in ("'", '"'):
            return self._read_string(start_line, start_col)

        if ch.isdigit():
            return self._read_number(start_line, start_col)

        if ch == "." and self._peek() is not None and self._peek().isdigit():
            return self._read_number(start_line, start_col)

        if ch.isalpha() or ch == "_":
            return self._read_identifier_or_keyword(start_line, start_col)

        if ch == "(":
            self._advance()
            return Token(TokenType.LPAREN, "(", start_line, start_col)
        if ch == ")":
            self._advance()
            return Token(TokenType.RPAREN, ")", start_line, start_col)
        if ch == ",":
            self._advance()
            return Token(TokenType.COMMA, ",", start_line, start_col)
        if ch == ";":
            self._advance()
            return Token(TokenType.SEMICOLON, ";", start_line, start_col)
        if ch == ".":
            self._advance()
            return Token(TokenType.DOT, ".", start_line, start_col)

        if ch == "*":
            self._advance()
            return Token(TokenType.STAR, "*", start_line, start_col)

        return self._read_operator(start_line, start_col)

    def _read_string(self, line: int, col: int) -> Token:
        quote = self._advance()
        buf: list[str] = []
        while self._pos < len(self._source):
            ch = self._source[self._pos]
            if ch == "\\":
                self._advance()
                if self._pos >= len(self._source):
                    raise LexerError("Unterminated string escape", self._line, self._col)
                esc = self._advance()
                escape_map = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\", "'": "'", '"': '"'}
                buf.append(escape_map.get(esc, esc))
            elif ch == quote:
                if self._peek() == quote:
                    self._advance()
                    buf.append(self._advance())
                else:
                    self._advance()
                    return Token(TokenType.STRING, "".join(buf), line, col)
            else:
                buf.append(self._advance())
        raise LexerError("Unterminated string literal", line, col)

    def _read_number(self, line: int, col: int) -> Token:
        buf: list[str] = []
        has_dot = False

        if self._pos < len(self._source) and self._source[self._pos] == ".":
            buf.append(self._advance())
            has_dot = True

        while self._pos < len(self._source) and self._source[self._pos].isdigit():
            buf.append(self._advance())

        if not has_dot and self._pos < len(self._source) and self._source[self._pos] == ".":
            nxt = self._peek()
            if nxt is not None and nxt.isdigit():
                buf.append(self._advance())
                has_dot = True
                while self._pos < len(self._source) and self._source[self._pos].isdigit():
                    buf.append(self._advance())
            elif nxt is None or not nxt.isalpha():
                buf.append(self._advance())
                has_dot = True
                while self._pos < len(self._source) and self._source[self._pos].isdigit():
                    buf.append(self._advance())

        if self._pos < len(self._source) and self._source[self._pos] in ("e", "E"):
            buf.append(self._advance())
            has_dot = True
            if self._pos < len(self._source) and self._source[self._pos] in ("+", "-"):
                buf.append(self._advance())
            while self._pos < len(self._source) and self._source[self._pos].isdigit():
                buf.append(self._advance())

        val = "".join(buf)
        if has_dot:
            return Token(TokenType.FLOAT, val, line, col)
        return Token(TokenType.NUMBER, val, line, col)

    def _read_identifier_or_keyword(self, line: int, col: int) -> Token:
        buf: list[str] = []
        while self._pos < len(self._source) and (
            self._source[self._pos].isalnum() or self._source[self._pos] == "_"
        ):
            buf.append(self._advance())

        word = "".join(buf)
        upper = word.upper()

        if upper == "GROUP" or upper == "ORDER":
            saved_pos = self._pos
            saved_line = self._line
            saved_col = self._col
            self._skip_whitespace_and_comments()
            if self._pos < len(self._source):
                by_buf: list[str] = []
                while self._pos < len(self._source) and (
                    self._source[self._pos].isalnum() or self._source[self._pos] == "_"
                ):
                    by_buf.append(self._advance())
                by_word = "".join(by_buf)
                if by_word.upper() == "BY":
                    if upper == "GROUP":
                        return Token(TokenType.GROUP_BY, "GROUP BY", line, col)
                    return Token(TokenType.ORDER_BY, "ORDER BY", line, col)
            self._pos = saved_pos
            self._line = saved_line
            self._col = saved_col

        kw = _KEYWORDS.get(upper)
        if kw is not None:
            return Token(kw, word, line, col)

        if "%" in word or "_" in word and any(c in word for c in "%"):
            return Token(TokenType.WILDCARD, word, line, col)

        return Token(TokenType.IDENTIFIER, word, line, col)

    def _read_operator(self, line: int, col: int) -> Token:
        ch = self._current()
        two_char = ch + (self._peek() or "")

        if two_char in _MULTI_CHAR_OPS:
            self._advance()
            self._advance()
            return Token(TokenType.OPERATOR, two_char, line, col)

        if ch in _SINGLE_CHAR_OPS:
            self._advance()
            return Token(TokenType.OPERATOR, ch, line, col)

        if ch == "!":
            self._advance()
            if self._pos < len(self._source) and self._source[self._pos] == "=":
                self._advance()
                return Token(TokenType.OPERATOR, "!=", line, col)
            return Token(TokenType.OPERATOR, "!", line, col)

        raise LexerError(f"Unexpected character: {ch!r}", line, col)


class TokenStream:
    """Provides lookahead and consumption over a token list."""

    def __init__(self, tokens: list[Token]) -> None:
        self._tokens = tokens
        self._pos = 0

    @property
    def position(self) -> int:
        return self._pos

    def current(self) -> Token:
        if self._pos < len(self._tokens):
            return self._tokens[self._pos]
        return self._tokens[-1]

    def peek(self, offset: int = 0) -> Token:
        idx = self._pos + offset
        if idx < len(self._tokens):
            return self._tokens[idx]
        return self._tokens[-1]

    def advance(self) -> Token:
        tok = self.current()
        if self._pos < len(self._tokens) - 1:
            self._pos += 1
        return tok

    def expect(self, token_type: TokenType) -> Token:
        tok = self.current()
        if tok.type != token_type:
            raise SyntaxError(
                f"Expected {token_type.name}, got {tok.type.name} ({tok.value!r}) "
                f"at L{tok.line}:{tok.col}"
            )
        return self.advance()

    def match(self, *types: TokenType) -> Token | None:
        if self.current().type in types:
            return self.advance()
        return None

    def at_end(self) -> bool:
        return self.current().type == TokenType.EOF

    def check(self, *types: TokenType) -> bool:
        return self.current().type in types

    def save(self) -> int:
        return self._pos

    def restore(self, pos: int) -> None:
        self._pos = pos
