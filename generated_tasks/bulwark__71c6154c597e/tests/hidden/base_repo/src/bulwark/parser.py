"""Pratt parser for the bulwark rule DSL.

Grammar (informal):

    program     := phase*
    phase       := "phase" IDENT "{" rule* "}"
    rule        := "rule" IDENT "{" "when" expr "then" action "}"
    action      := IDENT "(" args? ")"
    args        := arg ("," arg)*
    arg         := IDENT "=" expr | expr

    expr        := or_expr
    or_expr     := and_expr ("or" and_expr)*
    and_expr    := not_expr ("and" not_expr)*
    not_expr    := "not" not_expr | rel_expr
    rel_expr    := atom (rel_op atom)?
    rel_op      := "==" | "!=" | "<" | "<=" | ">" | ">=" | "matches" | "in"
    atom        := literal | path | "(" expr ")" | call | list_lit
    list_lit    := "[" (expr ("," expr)*)? "]"
    call        := IDENT "(" args? ")"
    path        := IDENT ("." IDENT)*

The parser is recursive-descent with a single token of lookahead. The
relational layer is intentionally non-associative: ``a == b == c`` is
a syntax error, not ``(a == b) == c``.
"""

from __future__ import annotations

from bulwark.ast_nodes import (
    Action,
    Binary,
    BoolLit,
    Call,
    Expr,
    FloatLit,
    IntLit,
    ListLit,
    NullLit,
    Path,
    Phase,
    Program,
    RegexLit,
    Rule,
    StringLit,
    Unary,
)
from bulwark.errors import ParseError
from bulwark.lexer import tokenize
from bulwark.span import Span
from bulwark.tokens import Tok, Token


_REL_OPS_BY_TOK: dict[Tok, str] = {
    Tok.EQEQ: "==",
    Tok.NEQ: "!=",
    Tok.LT: "<",
    Tok.LE: "<=",
    Tok.GT: ">",
    Tok.GE: ">=",
    Tok.MATCHES: "matches",
}


def parse(source: str) -> Program:
    """Parse a rule-language source file into a :class:`Program`."""
    tokens = tokenize(source)
    p = _Parser(tokens, source)
    prog = p.parse_program()
    # Defensive: every token must be consumed except for the trailing EOF.
    if p._peek().kind is not Tok.EOF:  # pragma: no cover - belt and suspenders
        raise ParseError("trailing tokens after program", p._peek().span)
    return prog


class _Parser:
    __slots__ = ("toks", "src", "i")

    def __init__(self, tokens: list[Token], source: str) -> None:
        self.toks = tokens
        self.src = source
        self.i = 0

    # ---- low-level ------------------------------------------------------

    def _peek(self, offset: int = 0) -> Token:
        return self.toks[self.i + offset]

    def _advance(self) -> Token:
        t = self.toks[self.i]
        self.i += 1
        return t

    def _check(self, kind: Tok) -> bool:
        return self._peek().kind is kind

    def _match(self, *kinds: Tok) -> bool:
        if self._peek().kind in kinds:
            self._advance()
            return True
        return False

    def _expect(self, kind: Tok, what: str) -> Token:
        t = self._peek()
        if t.kind is not kind:
            raise ParseError(
                f"expected {what}, found {t.kind.name.lower()}", t.span
            )
        return self._advance()

    def _expect_ident(self, what: str) -> Token:
        t = self._peek()
        if t.kind is not Tok.IDENT:
            raise ParseError(
                f"expected {what}, found {t.kind.name.lower()}", t.span
            )
        return self._advance()

    def _expect_keyword(self, word: str) -> Token:
        t = self._peek()
        if t.kind is not Tok.IDENT or t.value != word:
            raise ParseError(f"expected '{word}'", t.span)
        return self._advance()

    def _check_keyword(self, word: str) -> bool:
        t = self._peek()
        return t.kind is Tok.IDENT and t.value == word

    # ---- top-level ------------------------------------------------------

    def parse_program(self) -> Program:
        phases: list[Phase] = []
        start = self._peek().span.start
        while not self._check(Tok.EOF):
            phases.append(self._parse_phase())
        end = self._peek().span.end
        return Program(tuple(phases), Span(start, end))

    def _parse_phase(self) -> Phase:
        kw = self._expect_keyword("phase")
        name_tok = self._expect_ident("phase name")
        self._expect(Tok.LBRACE, "'{'")
        rules: list[Rule] = []
        while not self._check(Tok.RBRACE):
            if self._check(Tok.EOF):
                raise ParseError("unterminated phase block", kw.span)
            rules.append(self._parse_rule())
        rbrace = self._expect(Tok.RBRACE, "'}'")
        assert isinstance(name_tok.value, str)
        return Phase(name_tok.value, tuple(rules), Span(kw.span.start, rbrace.span.end))

    def _parse_rule(self) -> Rule:
        kw = self._expect_keyword("rule")
        name_tok = self._expect_ident("rule name")
        self._expect(Tok.LBRACE, "'{'")
        self._expect_keyword("when")
        when_expr = self._parse_expr()
        self._expect_keyword("then")
        action = self._parse_action()
        rbrace = self._expect(Tok.RBRACE, "'}'")
        assert isinstance(name_tok.value, str)
        return Rule(
            name_tok.value, when_expr, action, Span(kw.span.start, rbrace.span.end)
        )

    def _parse_action(self) -> Action:
        name_tok = self._expect_ident("action name")
        self._expect(Tok.LPAREN, "'('")
        args, kwargs = self._parse_arg_list()
        rparen = self._expect(Tok.RPAREN, "')'")
        assert isinstance(name_tok.value, str)
        return Action(name_tok.value, args, kwargs, Span(name_tok.span.start, rparen.span.end))

    # ---- expressions ----------------------------------------------------

    def _parse_expr(self) -> Expr:
        return self._parse_or()

    def _parse_or(self) -> Expr:
        left = self._parse_and()
        while self._check_keyword("or"):
            self._advance()
            right = self._parse_and()
            left = Binary("or", left, right, left.span.merge(right.span))
        return left

    def _parse_and(self) -> Expr:
        left = self._parse_not()
        while self._check_keyword("and"):
            self._advance()
            right = self._parse_not()
            left = Binary("and", left, right, left.span.merge(right.span))
        return left

    def _parse_not(self) -> Expr:
        if self._check_keyword("not"):
            t = self._advance()
            inner = self._parse_not()
            return Unary("not", inner, Span(t.span.start, inner.span.end))
        return self._parse_rel()

    def _parse_rel(self) -> Expr:
        left = self._parse_atom()
        t = self._peek()
        if t.kind in _REL_OPS_BY_TOK:
            self._advance()
            right = self._parse_atom()
            op = _REL_OPS_BY_TOK[t.kind]
            return Binary(op, left, right, left.span.merge(right.span))
        if self._check_keyword("matches"):
            self._advance()
            right = self._parse_atom()
            return Binary("matches", left, right, left.span.merge(right.span))
        if self._check_keyword("in"):
            self._advance()
            right = self._parse_atom()
            return Binary("in", left, right, left.span.merge(right.span))
        return left

    def _parse_atom(self) -> Expr:
        t = self._peek()
        if t.kind is Tok.INT:
            self._advance()
            assert isinstance(t.value, int)
            return IntLit(t.value, t.span)
        if t.kind is Tok.FLOAT:
            self._advance()
            assert isinstance(t.value, float)
            return FloatLit(t.value, t.span)
        if t.kind is Tok.STRING:
            self._advance()
            assert isinstance(t.value, str)
            return StringLit(t.value, t.span)
        if t.kind is Tok.REGEX:
            self._advance()
            assert isinstance(t.value, str)
            return RegexLit(t.value, t.span)
        if t.kind is Tok.LPAREN:
            self._advance()
            inner = self._parse_expr()
            self._expect(Tok.RPAREN, "')'")
            return inner
        if t.kind is Tok.LBRACK:
            return self._parse_list_lit()
        if t.kind is Tok.IDENT:
            return self._parse_ident_atom()
        raise ParseError(f"unexpected {t.kind.name.lower()}", t.span)

    def _parse_list_lit(self) -> Expr:
        lbrack = self._expect(Tok.LBRACK, "'['")
        items: list[Expr] = []
        if not self._check(Tok.RBRACK):
            items.append(self._parse_expr())
            while self._match(Tok.COMMA):
                items.append(self._parse_expr())
        rbrack = self._expect(Tok.RBRACK, "']'")
        return ListLit(tuple(items), Span(lbrack.span.start, rbrack.span.end))

    def _parse_ident_atom(self) -> Expr:
        head = self._advance()
        assert isinstance(head.value, str)
        # Reserved literals
        if head.value == "true":
            return BoolLit(True, head.span)
        if head.value == "false":
            return BoolLit(False, head.span)
        if head.value == "null":
            return NullLit(head.span)
        # Function call -- IDENT followed immediately by "("
        if self._check(Tok.LPAREN):
            self._advance()
            args, kwargs = self._parse_arg_list()
            rparen = self._expect(Tok.RPAREN, "')'")
            return Call(
                head.value,
                args,
                kwargs,
                Span(head.span.start, rparen.span.end),
            )
        # Path (dotted identifier sequence)
        parts: list[str] = [head.value]
        end = head.span.end
        while self._match(Tok.DOT):
            seg = self._expect_ident("path segment")
            assert isinstance(seg.value, str)
            parts.append(seg.value)
            end = seg.span.end
        return Path(tuple(parts), Span(head.span.start, end))

    def _parse_arg_list(
        self,
    ) -> tuple[tuple[Expr, ...], tuple[tuple[str, Expr], ...]]:
        args: list[Expr] = []
        kwargs: list[tuple[str, Expr]] = []
        if self._check(Tok.RPAREN):
            return tuple(args), tuple(kwargs)
        while True:
            if (
                self._peek().kind is Tok.IDENT
                and self._peek(1).kind is Tok.EQ
            ):
                name_tok = self._advance()
                self._advance()  # consume '='
                value = self._parse_expr()
                assert isinstance(name_tok.value, str)
                kwargs.append((name_tok.value, value))
            else:
                if kwargs:
                    raise ParseError(
                        "positional argument after keyword argument",
                        self._peek().span,
                    )
                args.append(self._parse_expr())
            if not self._match(Tok.COMMA):
                break
        return tuple(args), tuple(kwargs)
