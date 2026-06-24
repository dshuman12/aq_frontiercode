package jsonpath

import "testing"

func TestField(t *testing.T) {
	v := map[string]any{"name": "kindling", "version": 1.0}
	out, err := Eval("$.name", v)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 1 || out[0].(string) != "kindling" {
		t.Fatalf("got %v", out)
	}
}

func TestIndex(t *testing.T) {
	v := map[string]any{"items": []any{"a", "b", "c"}}
	out, _ := Eval("$.items[1]", v)
	if out[0].(string) != "b" {
		t.Fatalf("got %v", out)
	}
}

func TestNegativeIndex(t *testing.T) {
	v := map[string]any{"items": []any{"a", "b", "c"}}
	out, _ := Eval("$.items[-1]", v)
	if out[0].(string) != "c" {
		t.Fatalf("got %v", out)
	}
}

func TestWildcard(t *testing.T) {
	v := map[string]any{"items": []any{"a", "b", "c"}}
	out, _ := Eval("$.items[*]", v)
	if len(out) != 3 {
		t.Fatalf("got %v", out)
	}
}

func TestRecursive(t *testing.T) {
	v := map[string]any{
		"a": map[string]any{
			"b": map[string]any{
				"name": "deep",
			},
			"name": "mid",
		},
		"name": "top",
	}
	out, _ := Eval("$..name", v)
	if len(out) != 3 {
		t.Fatalf("got %v", out)
	}
}

func TestQuotedField(t *testing.T) {
	v := map[string]any{"weird-field": "value"}
	out, _ := Eval("$['weird-field']", v)
	if out[0].(string) != "value" {
		t.Fatalf("got %v", out)
	}
}

func TestErrors(t *testing.T) {
	if _, err := Eval("name", nil); err == nil {
		t.Fatal("expected err")
	}
	if _, err := Eval("$.[", nil); err == nil {
		t.Fatal("expected err")
	}
}
