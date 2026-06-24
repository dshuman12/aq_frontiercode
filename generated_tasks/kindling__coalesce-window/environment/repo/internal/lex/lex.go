// Package lex implements a tiny lexer for the kindling query syntax.
//
// Grammar:
//
//	query     := predicate ( ( "AND" | "OR" ) predicate )*
//	predicate := IDENT ( ":" | "=" | "~" | "<" | ">" | "<=" | ">=" ) value
//	value     := IDENT | NUMBER | STRING | TIMESTAMP
package lex

import (
	"fmt"
	"strings"
	"unicode"
)

// TokenKind tags every token.
type TokenKind int

const (
	// TokEOF marks the end of input.
	TokEOF TokenKind = iota
	// TokIdent is an unquoted identifier.
	TokIdent
	// TokString is a double-quoted string literal.
	TokString
	// TokNumber is a numeric literal (integer or float).
	TokNumber
	// TokOp is one of `:`, `=`, `~`, `<`, `<=`, `>`, `>=`.
	TokOp
	// TokAnd is the keyword AND.
	TokAnd
	// TokOr is the keyword OR.
	TokOr
	// TokLParen / TokRParen are parentheses.
	TokLParen
	TokRParen
)

// Token is one parsed lexeme.
type Token struct {
	Kind  TokenKind
	Value string
	Pos   int
}

// String returns a debug representation of the token.
func (t Token) String() string {
	return fmt.Sprintf("Token{kind=%d, value=%q}", t.Kind, t.Value)
}

// Lex returns the slice of tokens for the input. On error, the
// returned slice contains every token successfully lexed before the
// failure point.
func Lex(input string) ([]Token, error) {
	l := &lexer{input: input}
	for {
		l.skipWhitespace()
		if l.pos >= len(l.input) {
			l.tokens = append(l.tokens, Token{Kind: TokEOF, Pos: l.pos})
			return l.tokens, nil
		}
		if l.regexNext {
			l.regexNext = false
			l.lexRegexLiteral()
			continue
		}
		switch ch := l.input[l.pos]; {
		case ch == '(':
			l.tokens = append(l.tokens, Token{Kind: TokLParen, Value: "(", Pos: l.pos})
			l.pos++
		case ch == ')':
			l.tokens = append(l.tokens, Token{Kind: TokRParen, Value: ")", Pos: l.pos})
			l.pos++
		case ch == '"':
			if err := l.lexString(); err != nil {
				return l.tokens, err
			}
		case ch == '!' && l.pos+1 < len(l.input) && l.input[l.pos+1] == '=':
			l.tokens = append(l.tokens, Token{Kind: TokOp, Value: "!=", Pos: l.pos})
			l.pos += 2
		case isOp(ch):
			l.lexOp()
		case unicode.IsDigit(rune(ch)) || (ch == '-' && l.pos+1 < len(l.input) && unicode.IsDigit(rune(l.input[l.pos+1]))):
			l.lexNumber()
		case isIdentStart(ch):
			l.lexIdent()
		default:
			return l.tokens, fmt.Errorf("lex: unexpected '%c' at %d", ch, l.pos)
		}
	}
}

func (l *lexer) lexRegexLiteral() {
	start := l.pos
	for l.pos < len(l.input) && !unicode.IsSpace(rune(l.input[l.pos])) {
		l.pos++
	}
	l.tokens = append(l.tokens, Token{Kind: TokString, Value: l.input[start:l.pos], Pos: start})
}

type lexer struct {
	input     string
	pos       int
	tokens    []Token
	regexNext bool
}

func (l *lexer) skipWhitespace() {
	for l.pos < len(l.input) && unicode.IsSpace(rune(l.input[l.pos])) {
		l.pos++
	}
}

func (l *lexer) lexString() error {
	start := l.pos
	l.pos++
	var b strings.Builder
	for l.pos < len(l.input) {
		ch := l.input[l.pos]
		if ch == '"' {
			l.pos++
			l.tokens = append(l.tokens, Token{Kind: TokString, Value: b.String(), Pos: start})
			return nil
		}
		if ch == '\\' && l.pos+1 < len(l.input) {
			l.pos++
			esc := l.input[l.pos]
			switch esc {
			case 'n':
				b.WriteByte('\n')
			case 't':
				b.WriteByte('\t')
			case 'r':
				b.WriteByte('\r')
			case '"':
				b.WriteByte('"')
			case '\\':
				b.WriteByte('\\')
			default:
				b.WriteByte(esc)
			}
			l.pos++
			continue
		}
		b.WriteByte(ch)
		l.pos++
	}
	return fmt.Errorf("lex: unterminated string at %d", start)
}

func (l *lexer) lexOp() {
	start := l.pos
	op := string(l.input[l.pos])
	l.pos++
	if l.pos < len(l.input) && (l.input[l.pos] == '=') && (op == "<" || op == ">") {
		op += "="
		l.pos++
	}
	l.tokens = append(l.tokens, Token{Kind: TokOp, Value: op, Pos: start})
	if op == "~" {
		l.regexNext = true
	}
}

func (l *lexer) lexNumber() {
	start := l.pos
	if l.input[l.pos] == '-' {
		l.pos++
	}
	for l.pos < len(l.input) && (unicode.IsDigit(rune(l.input[l.pos])) || l.input[l.pos] == '.') {
		l.pos++
	}
	l.tokens = append(l.tokens, Token{Kind: TokNumber, Value: l.input[start:l.pos], Pos: start})
}

func (l *lexer) lexIdent() {
	start := l.pos
	for l.pos < len(l.input) && isIdentBody(l.input[l.pos]) {
		l.pos++
	}
	value := l.input[start:l.pos]
	switch strings.ToUpper(value) {
	case "AND":
		l.tokens = append(l.tokens, Token{Kind: TokAnd, Value: value, Pos: start})
	case "OR":
		l.tokens = append(l.tokens, Token{Kind: TokOr, Value: value, Pos: start})
	default:
		l.tokens = append(l.tokens, Token{Kind: TokIdent, Value: value, Pos: start})
	}
}

func isOp(ch byte) bool {
	switch ch {
	case ':', '=', '~', '<', '>':
		return true
	}
	return false
}

func isIdentStart(ch byte) bool {
	return ch == '_' || unicode.IsLetter(rune(ch))
}

func isIdentBody(ch byte) bool {
	return ch == '_' || ch == '.' || ch == '-' || unicode.IsLetter(rune(ch)) || unicode.IsDigit(rune(ch))
}
