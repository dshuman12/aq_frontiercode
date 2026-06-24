package parsec_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/parsec"
)

func TestAtEnd(t *testing.T) {
	c := parsec.New("ab")
	c.Bump()
	c.Bump()
	if !c.AtEnd() {
		t.Error("not at end")
	}
}

func TestPeekDoesNotAdvance(t *testing.T) {
	c := parsec.New("abc")
	r, _ := c.Peek()
	if r != 'a' {
		t.Errorf("got %c", r)
	}
	if c.Pos != 0 {
		t.Errorf("pos=%d", c.Pos)
	}
}

func TestEatMatch(t *testing.T) {
	c := parsec.New("hello world")
	if !c.Eat("hello") {
		t.Error("hello")
	}
	if c.Pos != 5 {
		t.Errorf("pos=%d", c.Pos)
	}
}

func TestEatMiss(t *testing.T) {
	c := parsec.New("hello world")
	if c.Eat("HELLO") {
		t.Error("should miss")
	}
	if c.Pos != 0 {
		t.Errorf("pos changed: %d", c.Pos)
	}
}

func TestTakeWhile(t *testing.T) {
	c := parsec.New("abc123")
	got := c.TakeWhile(func(r rune) bool { return r >= 'a' && r <= 'z' })
	if got != "abc" {
		t.Errorf("got %q", got)
	}
	if c.Pos != 3 {
		t.Errorf("pos=%d", c.Pos)
	}
}

func TestIdent(t *testing.T) {
	c := parsec.New("foo_bar 123")
	got, ok := c.Ident()
	if !ok || got != "foo_bar" {
		t.Errorf("got %q ok=%v", got, ok)
	}
}

func TestIdentRejectsDigit(t *testing.T) {
	c := parsec.New("123abc")
	if _, ok := c.Ident(); ok {
		t.Error("should reject")
	}
}

func TestDigit(t *testing.T) {
	c := parsec.New("42next")
	n, ok := c.Digit()
	if !ok || n != 42 {
		t.Errorf("got %d ok=%v", n, ok)
	}
}

func TestDigitMiss(t *testing.T) {
	c := parsec.New("xyz")
	if _, ok := c.Digit(); ok {
		t.Error("should miss")
	}
}

func TestSkipWhitespace(t *testing.T) {
	c := parsec.New("   foo")
	c.SkipWhitespace()
	if c.Pos != 3 {
		t.Errorf("pos=%d", c.Pos)
	}
}

func TestUnicodeSafe(t *testing.T) {
	c := parsec.New("café")
	c.Bump()
	c.Bump()
	c.Bump()
	r, _ := c.Bump()
	if r != 'é' {
		t.Errorf("got %c", r)
	}
}
