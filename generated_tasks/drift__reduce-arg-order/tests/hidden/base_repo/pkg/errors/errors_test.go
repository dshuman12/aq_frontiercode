package errors

import (
	"strings"
	"testing"

	"github.com/Mustafa4ngin/Drift/pkg/token"
)

func span(line, col int) token.Span {
	return token.Span{
		Start: token.Pos{Line: line, Column: col},
		End:   token.Pos{Line: line, Column: col + 1},
	}
}

func TestDriftErrorMessage(t *testing.T) {
	err := New(PhaseLexer, "unexpected character", span(1, 5))
	if !strings.Contains(err.Error(), "LexError") {
		t.Errorf("expected LexError prefix, got %q", err.Error())
	}
	if !strings.Contains(err.Error(), "unexpected character") {
		t.Error("expected message in error")
	}
}

func TestDriftErrorWithHint(t *testing.T) {
	err := New(PhaseParser, "missing semicolon", span(1, 10)).
		WithHint("add ';' after expression")
	if !strings.Contains(err.Error(), "hint:") {
		t.Error("expected hint in output")
	}
}

func TestDriftErrorWithSource(t *testing.T) {
	err := New(PhaseLexer, "bad char", span(1, 5)).
		WithSource("let x = @")
	s := err.Error()
	if !strings.Contains(s, "let x = @") {
		t.Errorf("expected source line in output, got %q", s)
	}
}

func TestErrorList(t *testing.T) {
	el := NewList()
	if el.HasErrors() {
		t.Error("new list should have no errors")
	}
	el.AddNew(PhaseParser, "error 1", span(1, 1))
	el.AddNew(PhaseParser, "error 2", span(2, 1))
	if el.Count() != 2 {
		t.Errorf("expected 2 errors, got %d", el.Count())
	}
	if !el.HasErrors() {
		t.Error("should have errors")
	}
}

func TestErrorListFirst(t *testing.T) {
	el := NewList()
	if el.First() != nil {
		t.Error("First() should be nil for empty list")
	}
	el.AddNew(PhaseParser, "first", span(1, 1))
	el.AddNew(PhaseParser, "second", span(2, 1))
	if el.First().Message != "first" {
		t.Errorf("expected 'first', got %q", el.First().Message)
	}
}

func TestErrorListSetSource(t *testing.T) {
	el := NewList()
	el.AddNew(PhaseLexer, "err", span(1, 1))
	el.SetSource("let x = 5")
	if el.Errors[0].Source != "let x = 5" {
		t.Error("expected source to be set")
	}
}

func TestConvenienceConstructors(t *testing.T) {
	le := LexError("bad", span(1, 1))
	if le.Phase != PhaseLexer {
		t.Error("expected LexError phase")
	}
	pe := ParseError("missing", span(1, 1))
	if pe.Phase != PhaseParser {
		t.Error("expected ParseError phase")
	}
	te := TypeError("mismatch", span(1, 1))
	if te.Phase != PhaseChecker {
		t.Error("expected TypeError phase")
	}
	re := RuntimeError("division", span(1, 1))
	if re.Phase != PhaseRuntime {
		t.Error("expected RuntimeError phase")
	}
}

func TestPhaseString(t *testing.T) {
	if PhaseLexer.String() != "LexError" {
		t.Errorf("expected 'LexError', got %q", PhaseLexer.String())
	}
}

func TestNewf(t *testing.T) {
	err := Newf(PhaseParser, span(1, 1), "expected %s, got %s", "int", "string")
	if !strings.Contains(err.Message, "expected int, got string") {
		t.Errorf("unexpected message: %q", err.Message)
	}
}