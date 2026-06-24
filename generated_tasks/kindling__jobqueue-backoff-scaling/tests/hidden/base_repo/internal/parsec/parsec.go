// Package parsec is a tiny parser-combinator toolkit used by other
// kindling parsers (queries, expressions).
package parsec

import "unicode"

// Cursor tracks a position in input.
type Cursor struct {
	Input string
	Pos   int
}

// New returns a cursor at offset 0.
func New(input string) *Cursor {
	return &Cursor{Input: input}
}

// AtEnd reports whether the cursor is past the input.
func (c *Cursor) AtEnd() bool {
	return c.Pos >= len(c.Input)
}

// Peek returns the next rune.
func (c *Cursor) Peek() (rune, bool) {
	if c.AtEnd() {
		return 0, false
	}
	for _, r := range c.Input[c.Pos:] {
		return r, true
	}
	return 0, false
}

// Bump consumes the next rune and returns it.
func (c *Cursor) Bump() (rune, bool) {
	r, ok := c.Peek()
	if !ok {
		return 0, false
	}
	c.Pos += len(string(r))
	return r, true
}

// Eat consumes a literal prefix.
func (c *Cursor) Eat(prefix string) bool {
	if len(c.Input)-c.Pos < len(prefix) {
		return false
	}
	if c.Input[c.Pos:c.Pos+len(prefix)] != prefix {
		return false
	}
	c.Pos += len(prefix)
	return true
}

// TakeWhile consumes runes while pred is true.
func (c *Cursor) TakeWhile(pred func(rune) bool) string {
	start := c.Pos
	for {
		r, ok := c.Peek()
		if !ok || !pred(r) {
			break
		}
		c.Pos += len(string(r))
	}
	return c.Input[start:c.Pos]
}

// SkipWhitespace advances past Unicode whitespace.
func (c *Cursor) SkipWhitespace() {
	c.TakeWhile(unicode.IsSpace)
}

// Ident consumes an identifier `[A-Za-z_][A-Za-z_0-9]*`.
func (c *Cursor) Ident() (string, bool) {
	r, ok := c.Peek()
	if !ok || !(unicode.IsLetter(r) || r == '_') {
		return "", false
	}
	start := c.Pos
	c.Bump()
	c.TakeWhile(func(r rune) bool {
		return unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_'
	})
	return c.Input[start:c.Pos], true
}

// Digit consumes a non-negative decimal integer.
func (c *Cursor) Digit() (uint64, bool) {
	s := c.TakeWhile(func(r rune) bool { return r >= '0' && r <= '9' })
	if s == "" {
		return 0, false
	}
	var n uint64
	for _, r := range s {
		n = n*10 + uint64(r-'0')
	}
	return n, true
}
