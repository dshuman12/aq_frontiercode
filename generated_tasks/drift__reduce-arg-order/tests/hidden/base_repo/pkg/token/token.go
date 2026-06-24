package token

import "fmt"

type Type int

const (
	Illegal Type = iota
	EOF

	// Literals
	Int
	Float
	String
	True
	False

	// Identifiers
	Ident

	// Operators
	Plus
	Minus
	Star
	Slash
	Percent
	Bang
	Eq
	NotEq
	Lt
	Gt
	LtEq
	GtEq
	And
	Or
	Assign
	PlusAssign
	MinusAssign
	StarAssign
	SlashAssign
	Pipe

	// Delimiters
	LParen
	RParen
	LBrace
	RBrace
	LBracket
	RBracket
	Comma
	Colon
	Semicolon
	Arrow
	FatArrow
	Dot
	DotDot

	// Keywords
	Let
	Mut
	Fn
	Return
	If
	Else
	While
	For
	In
	Match
	Break
	Continue
	Nil
	Const
	Typeof
	Question
	QuestionQuestion
	QuestionDot
	Ellipsis
)

var typeNames = map[Type]string{
	Illegal:     "ILLEGAL",
	EOF:         "EOF",
	Int:         "INT",
	Float:       "FLOAT",
	String:      "STRING",
	True:        "TRUE",
	False:       "FALSE",
	Ident:       "IDENT",
	Plus:        "+",
	Minus:       "-",
	Star:        "*",
	Slash:       "/",
	Percent:     "%",
	Bang:        "!",
	Eq:          "==",
	NotEq:       "!=",
	Lt:          "<",
	Gt:          ">",
	LtEq:        "<=",
	GtEq:        ">=",
	And:         "&&",
	Or:          "||",
	Assign:      "=",
	PlusAssign:  "+=",
	MinusAssign: "-=",
	StarAssign:  "*=",
	SlashAssign: "/=",
	Pipe:        "|>",
	LParen:      "(",
	RParen:      ")",
	LBrace:      "{",
	RBrace:      "}",
	LBracket:    "[",
	RBracket:    "]",
	Comma:       ",",
	Colon:       ":",
	Semicolon:   ";",
	Arrow:       "->",
	FatArrow:    "=>",
	Dot:         ".",
	DotDot:      "..",
	Let:         "let",
	Mut:         "mut",
	Fn:          "fn",
	Return:      "return",
	If:          "if",
	Else:        "else",
	While:       "while",
	For:         "for",
	In:          "in",
	Match:       "match",
	Break:       "break",
	Continue:    "continue",
	Nil:              "nil",
	Const:            "const",
	Typeof:           "typeof",
	Question:         "?",
	QuestionQuestion: "??",
	QuestionDot:      "?.",
	Ellipsis:         "...",
}

func (t Type) String() string {
	if s, ok := typeNames[t]; ok {
		return s
	}
	return fmt.Sprintf("UNKNOWN(%d)", int(t))
}

var keywords = map[string]Type{
	"let":      Let,
	"mut":      Mut,
	"fn":       Fn,
	"return":   Return,
	"if":       If,
	"else":     Else,
	"while":    While,
	"for":      For,
	"in":       In,
	"match":    Match,
	"break":    Break,
	"continue": Continue,
	"true":     True,
	"false":    False,
	"nil":      Nil,
	"const":    Const,
	"typeof":   Typeof,
}

func LookupIdent(ident string) Type {
	if tok, ok := keywords[ident]; ok {
		return tok
	}
	return Ident
}

func IsKeyword(ident string) bool {
	_, ok := keywords[ident]
	return ok
}

type Pos struct {
	Line   int
	Column int
	Offset int
}

func (p Pos) String() string {
	return fmt.Sprintf("%d:%d", p.Line, p.Column)
}

type Span struct {
	Start Pos
	End   Pos
}

func (s Span) String() string {
	if s.Start.Line == s.End.Line {
		return fmt.Sprintf("%d:%d-%d", s.Start.Line, s.Start.Column, s.End.Column)
	}
	return fmt.Sprintf("%d:%d-%d:%d", s.Start.Line, s.Start.Column, s.End.Line, s.End.Column)
}

type Token struct {
	Type    Type
	Literal string
	Span    Span
}

func New(typ Type, literal string, span Span) Token {
	return Token{Type: typ, Literal: literal, Span: span}
}

func (t Token) String() string {
	return fmt.Sprintf("Token(%s, %q, %s)", t.Type, t.Literal, t.Span)
}

func (t Token) Is(typ Type) bool {
	return t.Type == typ
}

func (t Token) IsOneOf(types ...Type) bool {
	for _, typ := range types {
		if t.Type == typ {
			return true
		}
	}
	return false
}

func IsOperator(t Type) bool {
	return t >= Plus && t <= Pipe
}

func IsComparisonOp(t Type) bool {
	return t == Eq || t == NotEq || t == Lt || t == Gt || t == LtEq || t == GtEq
}

func IsAssignOp(t Type) bool {
	return t == Assign || t == PlusAssign || t == MinusAssign || t == StarAssign || t == SlashAssign
}