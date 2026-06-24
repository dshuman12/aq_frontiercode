package regex_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/regex"
)

func mustCompile(t *testing.T, s string) *regex.Pattern {
	t.Helper()
	p, err := regex.Compile(s)
	if err != nil {
		t.Fatal(err)
	}
	return p
}

func TestLiteral(t *testing.T) {
	p := mustCompile(t, "hello")
	if !p.Match("say hello") {
		t.Error("should match")
	}
	if p.Match("say bye") {
		t.Error("should not match")
	}
}

func TestAnyDoesNotMatchNewline(t *testing.T) {
	p := mustCompile(t, "a.c")
	if !p.Match("abc") {
		t.Error("should match abc")
	}
	if p.Match("a\nc") {
		t.Error("should not match newline")
	}
}

func TestCharClass(t *testing.T) {
	p := mustCompile(t, "^[a-z]$")
	if !p.Match("g") {
		t.Error("g")
	}
	if p.Match("G") {
		t.Error("G")
	}
}

func TestNegatedClass(t *testing.T) {
	p := mustCompile(t, "^[^a-z]$")
	if !p.Match("X") {
		t.Error("X")
	}
	if p.Match("a") {
		t.Error("a")
	}
}

func TestAnchorStart(t *testing.T) {
	p := mustCompile(t, "^foo")
	if !p.Match("foo bar") {
		t.Error("start")
	}
	if p.Match("x foo") {
		t.Error("should not match middle")
	}
}

func TestAnchorEnd(t *testing.T) {
	p := mustCompile(t, "foo$")
	if !p.Match("x foo") {
		t.Error("end")
	}
	if p.Match("foo bar") {
		t.Error("should not match middle")
	}
}

func TestEscape(t *testing.T) {
	p := mustCompile(t, `\.`)
	if !p.Match("x.y") {
		t.Error(".")
	}
	if p.Match("xay") {
		t.Error("a")
	}
}

func TestUnterminatedClass(t *testing.T) {
	if _, err := regex.Compile("[abc"); err == nil {
		t.Error("expected error")
	}
}

func TestUnmatchedParen(t *testing.T) {
	if _, err := regex.Compile("(abc"); err == nil {
		t.Error("expected error")
	}
}
