package lexer

import (
	"fmt"
	"unicode"
	"unicode/utf8"

	"github.com/Mustafa4ngin/Drift/pkg/errors"
	"github.com/Mustafa4ngin/Drift/pkg/token"
)

type Lexer struct {
	input   string
	pos     int
	readPos int
	ch      rune
	line    int
	col     int
	errors  *errors.ErrorList
}

func New(input string) *Lexer {
	l := &Lexer{
		input:  input,
		line:   1,
		col:    0,
		errors: errors.NewList(),
	}
	l.advance()
	return l
}

func (l *Lexer) Errors() *errors.ErrorList {
	return l.errors
}

func (l *Lexer) advance() {
	if l.readPos >= len(l.input) {
		l.ch = 0
		l.pos = l.readPos
		l.col++
		return
	}
	r, size := utf8.DecodeRuneInString(l.input[l.readPos:])
	l.pos = l.readPos
	l.readPos += size
	if l.ch == '\n' {
		l.line++
		l.col = 1
	} else {
		l.col++
	}
	l.ch = r
}

func (l *Lexer) peek() rune {
	if l.readPos >= len(l.input) {
		return 0
	}
	r, _ := utf8.DecodeRuneInString(l.input[l.readPos:])
	return r
}

func (l *Lexer) currentPos() token.Pos {
	return token.Pos{Line: l.line, Column: l.col, Offset: l.pos}
}

func (l *Lexer) makeSpan(start token.Pos) token.Span {
	return token.Span{Start: start, End: l.currentPos()}
}

func (l *Lexer) skipWhitespace() {
	for l.ch == ' ' || l.ch == '\t' || l.ch == '\r' || l.ch == '\n' {
		l.advance()
	}
}

func (l *Lexer) skipLineComment() {
	for l.ch != '\n' && l.ch != 0 {
		l.advance()
	}
}

func (l *Lexer) skipBlockComment() {
	l.advance() // skip *
	depth := 1
	for depth > 0 && l.ch != 0 {
		if l.ch == '/' && l.peek() == '*' {
			depth++
			l.advance()
		} else if l.ch == '*' && l.peek() == '/' {
			depth--
			l.advance()
		}
		l.advance()
	}
}

func (l *Lexer) NextToken() token.Token {
	for {
		l.skipWhitespace()
		if l.ch == '/' && l.peek() == '/' {
			l.skipLineComment()
			continue
		}
		if l.ch == '/' && l.peek() == '*' {
			l.advance() // skip /
			l.skipBlockComment()
			continue
		}
		break
	}

	start := l.currentPos()

	if l.ch == 0 {
		return token.New(token.EOF, "", l.makeSpan(start))
	}

	switch {
	case l.ch == '+':
		if l.peek() == '=' {
			l.advance()
			l.advance()
			return token.New(token.PlusAssign, "+=", l.makeSpan(start))
		}
		l.advance()
		return token.New(token.Plus, "+", l.makeSpan(start))

	case l.ch == '-':
		if l.peek() == '>' {
			l.advance()
			l.advance()
			return token.New(token.Arrow, "->", l.makeSpan(start))
		}
		if l.peek() == '=' {
			l.advance()
			l.advance()
			return token.New(token.MinusAssign, "-=", l.makeSpan(start))
		}
		l.advance()
		return token.New(token.Minus, "-", l.makeSpan(start))

	case l.ch == '*':
		if l.peek() == '=' {
			l.advance()
			l.advance()
			return token.New(token.StarAssign, "*=", l.makeSpan(start))
		}
		l.advance()
		return token.New(token.Star, "*", l.makeSpan(start))

	case l.ch == '/':
		if l.peek() == '=' {
			l.advance()
			l.advance()
			return token.New(token.SlashAssign, "/=", l.makeSpan(start))
		}
		l.advance()
		return token.New(token.Slash, "/", l.makeSpan(start))

	case l.ch == '%':
		l.advance()
		return token.New(token.Percent, "%", l.makeSpan(start))

	case l.ch == '!':
		if l.peek() == '=' {
			l.advance()
			l.advance()
			return token.New(token.NotEq, "!=", l.makeSpan(start))
		}
		l.advance()
		return token.New(token.Bang, "!", l.makeSpan(start))

	case l.ch == '=':
		if l.peek() == '=' {
			l.advance()
			l.advance()
			return token.New(token.Eq, "==", l.makeSpan(start))
		}
		if l.peek() == '>' {
			l.advance()
			l.advance()
			return token.New(token.FatArrow, "=>", l.makeSpan(start))
		}
		l.advance()
		return token.New(token.Assign, "=", l.makeSpan(start))

	case l.ch == '<':
		if l.peek() == '=' {
			l.advance()
			l.advance()
			return token.New(token.LtEq, "<=", l.makeSpan(start))
		}
		l.advance()
		return token.New(token.Lt, "<", l.makeSpan(start))

	case l.ch == '>':
		if l.peek() == '=' {
			l.advance()
			l.advance()
			return token.New(token.GtEq, ">=", l.makeSpan(start))
		}
		l.advance()
		return token.New(token.Gt, ">", l.makeSpan(start))

	case l.ch == '&':
		if l.peek() == '&' {
			l.advance()
			l.advance()
			return token.New(token.And, "&&", l.makeSpan(start))
		}
		l.advance()
		l.errors.Add(errors.LexError("unexpected character '&', did you mean '&&'?", l.makeSpan(start)))
		return token.New(token.Illegal, "&", l.makeSpan(start))

	case l.ch == '|':
		if l.peek() == '|' {
			l.advance()
			l.advance()
			return token.New(token.Or, "||", l.makeSpan(start))
		}
		if l.peek() == '>' {
			l.advance()
			l.advance()
			return token.New(token.Pipe, "|>", l.makeSpan(start))
		}
		l.advance()
		l.errors.Add(errors.LexError("unexpected character '|', did you mean '||' or '|>'?", l.makeSpan(start)))
		return token.New(token.Illegal, "|", l.makeSpan(start))

	case l.ch == '?':
		if l.peek() == '?' {
			l.advance()
			l.advance()
			return token.New(token.QuestionQuestion, "??", l.makeSpan(start))
		}
		if l.peek() == '.' {
			l.advance()
			l.advance()
			return token.New(token.QuestionDot, "?.", l.makeSpan(start))
		}
		l.advance()
		return token.New(token.Question, "?", l.makeSpan(start))

	case l.ch == '.':
		if l.peek() == '.' {
			l.advance()
			if l.peek() == '.' {
				l.advance()
				l.advance()
				return token.New(token.Ellipsis, "...", l.makeSpan(start))
			}
			l.advance()
			return token.New(token.DotDot, "..", l.makeSpan(start))
		}
		l.advance()
		return token.New(token.Dot, ".", l.makeSpan(start))

	case l.ch == '(':
		l.advance()
		return token.New(token.LParen, "(", l.makeSpan(start))
	case l.ch == ')':
		l.advance()
		return token.New(token.RParen, ")", l.makeSpan(start))
	case l.ch == '{':
		l.advance()
		return token.New(token.LBrace, "{", l.makeSpan(start))
	case l.ch == '}':
		l.advance()
		return token.New(token.RBrace, "}", l.makeSpan(start))
	case l.ch == '[':
		l.advance()
		return token.New(token.LBracket, "[", l.makeSpan(start))
	case l.ch == ']':
		l.advance()
		return token.New(token.RBracket, "]", l.makeSpan(start))
	case l.ch == ',':
		l.advance()
		return token.New(token.Comma, ",", l.makeSpan(start))
	case l.ch == ':':
		l.advance()
		return token.New(token.Colon, ":", l.makeSpan(start))
	case l.ch == ';':
		l.advance()
		return token.New(token.Semicolon, ";", l.makeSpan(start))

	case l.ch == '"':
		return l.readString()

	case isDigit(l.ch):
		return l.readNumber()

	case isIdentStart(l.ch):
		return l.readIdentifier()

	default:
		ch := l.ch
		l.advance()
		l.errors.Add(errors.LexError(
			fmt.Sprintf("unexpected character %q", ch),
			l.makeSpan(start),
		))
		return token.New(token.Illegal, string(ch), l.makeSpan(start))
	}
}

func (l *Lexer) readString() token.Token {
	start := l.currentPos()
	l.advance() // skip opening "

	var lit []rune
	for l.ch != '"' && l.ch != 0 {
		if l.ch == '\n' {
			l.errors.Add(errors.LexError("unterminated string literal", l.makeSpan(start)))
			return token.New(token.Illegal, string(lit), l.makeSpan(start))
		}
		if l.ch == '\\' {
			l.advance()
			switch l.ch {
			case 'n':
				lit = append(lit, '\n')
			case 't':
				lit = append(lit, '\t')
			case 'r':
				lit = append(lit, '\r')
			case '\\':
				lit = append(lit, '\\')
			case '"':
				lit = append(lit, '"')
			case '0':
				lit = append(lit, 0)
			default:
				l.errors.Add(errors.LexError(
					fmt.Sprintf("invalid escape sequence '\\%c'", l.ch),
					l.makeSpan(start),
				))
				lit = append(lit, l.ch)
			}
		} else {
			lit = append(lit, l.ch)
		}
		l.advance()
	}

	if l.ch == 0 {
		l.errors.Add(errors.LexError("unterminated string literal", l.makeSpan(start)))
		return token.New(token.Illegal, string(lit), l.makeSpan(start))
	}

	l.advance() // skip closing "
	return token.New(token.String, string(lit), l.makeSpan(start))
}

func (l *Lexer) readNumber() token.Token {
	start := l.currentPos()
	startPos := l.pos
	isFloat := false

	if l.ch == '0' && (l.peek() == 'x' || l.peek() == 'X') {
		l.advance() // 0
		l.advance() // x
		for isHexDigit(l.ch) || l.ch == '_' {
			l.advance()
		}
		return token.New(token.Int, l.input[startPos:l.pos], l.makeSpan(start))
	}

	if l.ch == '0' && (l.peek() == 'b' || l.peek() == 'B') {
		l.advance() // 0
		l.advance() // b
		for l.ch == '0' || l.ch == '1' || l.ch == '_' {
			l.advance()
		}
		return token.New(token.Int, l.input[startPos:l.pos], l.makeSpan(start))
	}

	for isDigit(l.ch) || l.ch == '_' {
		l.advance()
	}

	if l.ch == '.' && isDigit(l.peek()) {
		isFloat = true
		l.advance() // .
		for isDigit(l.ch) || l.ch == '_' {
			l.advance()
		}
	}

	if l.ch == 'e' || l.ch == 'E' {
		isFloat = true
		l.advance()
		if l.ch == '+' || l.ch == '-' {
			l.advance()
		}
		if !isDigit(l.ch) {
			l.errors.Add(errors.LexError("invalid number: expected digit after exponent", l.makeSpan(start)))
			return token.New(token.Illegal, l.input[startPos:l.pos], l.makeSpan(start))
		}
		for isDigit(l.ch) {
			l.advance()
		}
	}

	lit := l.input[startPos:l.pos]
	if isFloat {
		return token.New(token.Float, lit, l.makeSpan(start))
	}
	return token.New(token.Int, lit, l.makeSpan(start))
}

func (l *Lexer) readIdentifier() token.Token {
	start := l.currentPos()
	startPos := l.pos
	for isIdentPart(l.ch) {
		l.advance()
	}
	lit := l.input[startPos:l.pos]
	typ := token.LookupIdent(lit)
	return token.New(typ, lit, l.makeSpan(start))
}

func Tokenize(input string) ([]token.Token, *errors.ErrorList) {
	l := New(input)
	tokens := make([]token.Token, 0, len(input)/4+1)
	for {
		tok := l.NextToken()
		tokens = append(tokens, tok)
		if tok.Type == token.EOF {
			break
		}
	}
	return tokens, l.errors
}

func isDigit(ch rune) bool {
	return ch >= '0' && ch <= '9'
}

func isHexDigit(ch rune) bool {
	return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')
}

func isIdentStart(ch rune) bool {
	return ch == '_' || unicode.IsLetter(ch)
}

func isIdentPart(ch rune) bool {
	return ch == '_' || unicode.IsLetter(ch) || unicode.IsDigit(ch)
}