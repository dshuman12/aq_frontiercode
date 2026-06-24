package rewriter

import (
	"strings"
	"testing"
)

func TestDedup(t *testing.T) {
	tree := &Tree{Disjuncts: []Disjunct{{Preds: []Predicate{
		{Field: "level", Op: "=", Value: "info"},
		{Field: "service", Op: "=", Value: "auth"},
		{Field: "level", Op: "=", Value: "info"},
	}}}}
	out, stats := Rewrite(tree, Options{})
	if len(out.Disjuncts[0].Preds) != 2 {
		t.Fatalf("preds %v", out.Disjuncts[0].Preds)
	}
	if stats.Deduped != 1 {
		t.Fatalf("stats %+v", stats)
	}
}

func TestFoldImpossible(t *testing.T) {
	tree := &Tree{Disjuncts: []Disjunct{
		{Preds: []Predicate{{Field: "level", Op: "=", Value: ""}}},
		{Preds: []Predicate{{Field: "level", Op: "=", Value: "info"}}},
	}}
	out, _ := Rewrite(tree, Options{})
	if len(out.Disjuncts) != 1 {
		t.Fatalf("got %v", out.Disjuncts)
	}
}

func TestPushdownReorders(t *testing.T) {
	tree := &Tree{Disjuncts: []Disjunct{{Preds: []Predicate{
		{Field: "msg", Op: "~", Value: "/api/"},
		{Field: "level", Op: "=", Value: "info"},
	}}}}
	out, _ := Rewrite(tree, Options{})
	if out.Disjuncts[0].Preds[0].Op != "=" {
		t.Fatalf("expected = first, got %+v", out.Disjuncts[0].Preds)
	}
}

func TestRender(t *testing.T) {
	tree := &Tree{Disjuncts: []Disjunct{
		{Preds: []Predicate{{Field: "a", Op: "=", Value: "1"}, {Field: "b", Op: "=", Value: "2"}}},
		{Preds: []Predicate{{Field: "c", Op: "=", Value: "3"}}},
	}}
	if !strings.Contains(Render(tree), " OR ") {
		t.Fatal("missing OR")
	}
}
