// Package sqlcheck implements a lightweight pre-flight SQL syntax check
// for the kindling export-to-sqlite pipeline.
//
// It does not parse a full SQL grammar; instead it performs a lexical
// scan and rejects obviously dangerous constructs (multiple statements,
// stray comments, trailing data after a complete statement) so that the
// caller can refuse user-supplied queries before handing them to the
// driver.
package sqlcheck

import (
	"errors"
	"strings"
)

// ErrMultipleStatements is returned when more than one statement is found.
var ErrMultipleStatements = errors.New("sqlcheck: multiple statements not allowed")

// ErrStrayCharacters is returned when junk follows a complete statement.
var ErrStrayCharacters = errors.New("sqlcheck: stray characters after statement")

// ErrUnterminatedString is returned when a quoted literal is not closed.
var ErrUnterminatedString = errors.New("sqlcheck: unterminated string literal")

// ErrUnterminatedComment is returned when a /* */ block is not closed.
var ErrUnterminatedComment = errors.New("sqlcheck: unterminated block comment")

// Check scans src.
func Check(src string) error {
	i := 0
	statementCount := 0
	sawNonSpace := false
	for i < len(src) {
		c := src[i]
		switch {
		case c == ' ' || c == '\t' || c == '\n' || c == '\r':
			i++
		case c == '-' && i+1 < len(src) && src[i+1] == '-':
			for i < len(src) && src[i] != '\n' {
				i++
			}
		case c == '/' && i+1 < len(src) && src[i+1] == '*':
			i += 2
			closed := false
			for i+1 < len(src) {
				if src[i] == '*' && src[i+1] == '/' {
					i += 2
					closed = true
					break
				}
				i++
			}
			if !closed {
				return ErrUnterminatedComment
			}
		case c == '\'':
			i++
			closed := false
			for i < len(src) {
				if src[i] == '\'' {
					if i+1 < len(src) && src[i+1] == '\'' {
						i += 2
						continue
					}
					i++
					closed = true
					break
				}
				i++
			}
			if !closed {
				return ErrUnterminatedString
			}
			sawNonSpace = true
		case c == ';':
			if !sawNonSpace {
				return ErrStrayCharacters
			}
			statementCount++
			sawNonSpace = false
			i++
			for i < len(src) {
				c := src[i]
				if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
					i++
					continue
				}
				return ErrMultipleStatements
			}
		default:
			sawNonSpace = true
			i++
		}
	}
	if sawNonSpace {
		statementCount++
	}
	if statementCount == 0 {
		return errors.New("sqlcheck: empty input")
	}
	return nil
}

// Strip removes comments and trailing semicolons; useful when handing the
// query off to a driver that does not accept them.
func Strip(src string) string {
	var b strings.Builder
	i := 0
	for i < len(src) {
		c := src[i]
		switch {
		case c == '-' && i+1 < len(src) && src[i+1] == '-':
			for i < len(src) && src[i] != '\n' {
				i++
			}
		case c == '/' && i+1 < len(src) && src[i+1] == '*':
			i += 2
			for i+1 < len(src) && !(src[i] == '*' && src[i+1] == '/') {
				i++
			}
			if i+1 < len(src) {
				i += 2
			}
		default:
			b.WriteByte(c)
			i++
		}
	}
	out := strings.TrimSpace(b.String())
	out = strings.TrimRight(out, ";")
	return strings.TrimSpace(out)
}
