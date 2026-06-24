package lex_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/lex"
)

func TestLexEmpty(t *testing.T) {
	toks, err := lex.Lex("")
	if err != nil {
		t.Fatal(err)
	}
	if len(toks) != 1 || toks[0].Kind != lex.TokEOF {
		t.Errorf("got %v", toks)
	}
}

func TestLexIdentAndOp(t *testing.T) {
	toks, err := lex.Lex("level=info")
	if err != nil {
		t.Fatal(err)
	}
	want := []lex.TokenKind{lex.TokIdent, lex.TokOp, lex.TokIdent, lex.TokEOF}
	if len(toks) != len(want) {
		t.Fatalf("got %v", toks)
	}
	for i, k := range want {
		if toks[i].Kind != k {
			t.Errorf("[%d] got %v want %v", i, toks[i].Kind, k)
		}
	}
}

func TestLexAndOr(t *testing.T) {
	toks, _ := lex.Lex("a:1 AND b:2 OR c:3")
	var kinds []lex.TokenKind
	for _, t := range toks {
		kinds = append(kinds, t.Kind)
	}
	want := []lex.TokenKind{
		lex.TokIdent, lex.TokOp, lex.TokNumber,
		lex.TokAnd,
		lex.TokIdent, lex.TokOp, lex.TokNumber,
		lex.TokOr,
		lex.TokIdent, lex.TokOp, lex.TokNumber,
		lex.TokEOF,
	}
	if len(kinds) != len(want) {
		t.Fatalf("got %v", kinds)
	}
	for i := range want {
		if kinds[i] != want[i] {
			t.Errorf("[%d] got %v want %v", i, kinds[i], want[i])
		}
	}
}

func TestLexQuotedString(t *testing.T) {
	toks, _ := lex.Lex(`msg:"hello world"`)
	if len(toks) != 4 {
		t.Fatalf("got %v", toks)
	}
	if toks[2].Kind != lex.TokString || toks[2].Value != "hello world" {
		t.Errorf("got %v", toks[2])
	}
}

func TestLexEscapeInString(t *testing.T) {
	toks, _ := lex.Lex(`x:"a\nb"`)
	if toks[2].Value != "a\nb" {
		t.Errorf("got %q", toks[2].Value)
	}
}

func TestLexUnterminatedString(t *testing.T) {
	if _, err := lex.Lex(`x:"unterminated`); err == nil {
		t.Error("expected error")
	}
}

func TestLexNumber(t *testing.T) {
	toks, _ := lex.Lex("size>1024")
	if toks[2].Kind != lex.TokNumber || toks[2].Value != "1024" {
		t.Errorf("got %v", toks[2])
	}
}

func TestLexNegativeNumber(t *testing.T) {
	toks, _ := lex.Lex("delta:-15")
	if toks[2].Kind != lex.TokNumber || toks[2].Value != "-15" {
		t.Errorf("got %v", toks[2])
	}
}

func TestLexCompoundOp(t *testing.T) {
	toks, _ := lex.Lex("size>=1024 AND age<=30")
	if toks[1].Value != ">=" {
		t.Errorf("got %v", toks[1])
	}
	if toks[5].Value != "<=" {
		t.Errorf("got %v", toks[5])
	}
}

func TestLexParens(t *testing.T) {
	toks, _ := lex.Lex("(a:1 OR b:2)")
	if toks[0].Kind != lex.TokLParen || toks[len(toks)-2].Kind != lex.TokRParen {
		t.Errorf("got %v", toks)
	}
}

func TestLexUnknownChar(t *testing.T) {
	if _, err := lex.Lex("@@@"); err == nil {
		t.Error("expected error")
	}
}
