package parse_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/parse"
)

func TestSinglePredicate(t *testing.T) {
	q, err := parse.Parse("level=info")
	if err != nil {
		t.Fatal(err)
	}
	if len(q.Disjuncts) != 1 || len(q.Disjuncts[0].Preds) != 1 {
		t.Fatalf("got %v", q)
	}
	pred := q.Disjuncts[0].Preds[0]
	if pred.Field != "level" || pred.Op != parse.OpEq || pred.Value.Str != "info" {
		t.Errorf("got %+v", pred)
	}
}

func TestAnd(t *testing.T) {
	q, _ := parse.Parse("level=info AND service=auth")
	if len(q.Disjuncts) != 1 || len(q.Disjuncts[0].Preds) != 2 {
		t.Fatalf("got %v", q)
	}
}

func TestOr(t *testing.T) {
	q, _ := parse.Parse("level=warn OR level=error")
	if len(q.Disjuncts) != 2 {
		t.Fatalf("got %v", q)
	}
}

func TestNumberValue(t *testing.T) {
	q, _ := parse.Parse("size>1024")
	pred := q.Disjuncts[0].Preds[0]
	if pred.Op != parse.OpGt {
		t.Errorf("got %v", pred.Op)
	}
	if pred.Value.Kind != parse.ValNumber || pred.Value.Num != 1024 {
		t.Errorf("got %+v", pred.Value)
	}
}

func TestQuotedString(t *testing.T) {
	q, _ := parse.Parse(`msg:"hello world"`)
	pred := q.Disjuncts[0].Preds[0]
	if pred.Value.Str != "hello world" {
		t.Errorf("got %q", pred.Value.Str)
	}
}

func TestRegexOp(t *testing.T) {
	q, _ := parse.Parse("path~/api/.*")
	if q.Disjuncts[0].Preds[0].Op != parse.OpRegex {
		t.Errorf("got %v", q.Disjuncts[0].Preds[0].Op)
	}
}

func TestErrorMissingField(t *testing.T) {
	if _, err := parse.Parse("=info"); err == nil {
		t.Error("expected error")
	}
}

func TestErrorBadOperator(t *testing.T) {
	if _, err := parse.Parse("level @ info"); err == nil {
		t.Error("expected error")
	}
}

func TestErrorTrailingToken(t *testing.T) {
	if _, err := parse.Parse("level=info extra"); err == nil {
		t.Error("expected error")
	}
}

func TestOpString(t *testing.T) {
	cases := map[parse.Op]string{
		parse.OpEq:       "=",
		parse.OpNe:       "!=",
		parse.OpLt:       "<",
		parse.OpLe:       "<=",
		parse.OpGt:       ">",
		parse.OpGe:       ">=",
		parse.OpRegex:    "~",
		parse.OpContains: ":",
	}
	for o, s := range cases {
		if o.String() != s {
			t.Errorf("Op(%d).String() = %q, want %q", o, o.String(), s)
		}
	}
}
