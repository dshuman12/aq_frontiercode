package largejson

import (
	"strings"
	"testing"
)

func TestParseSimple(t *testing.T) {
	v, err := Parse(`{"a":1,"b":"x","c":[1,2,3],"d":true,"e":null}`)
	if err != nil {
		t.Fatal(err)
	}
	if v.Get("a").Number != 1 {
		t.Fatal("a")
	}
	if v.Get("c").Len() != 3 {
		t.Fatal("c")
	}
	if v.Get("d").Type != TypeBool || !v.Get("d").Bool {
		t.Fatal("d")
	}
}

func TestRoundTrip(t *testing.T) {
	src := `{"x":[1,2,3],"y":{"k":"v"}}`
	v, err := Parse(src)
	if err != nil {
		t.Fatal(err)
	}
	got := v.Render()
	if !strings.Contains(got, "x") || !strings.Contains(got, "k") {
		t.Fatalf("got %s", got)
	}
}

func TestAtNegative(t *testing.T) {
	v, _ := Parse(`[1,2,3]`)
	if v.At(-1).Number != 3 {
		t.Fatal("at -1")
	}
}

func TestEscape(t *testing.T) {
	v, _ := Parse(`"hello\nworld"`)
	if v.String != "hello\nworld" {
		t.Fatalf("got %q", v.String)
	}
}

func TestErrors(t *testing.T) {
	if _, err := Parse(`{"a":}`); err == nil {
		t.Fatal("expected err")
	}
	if _, err := Parse(`tru`); err == nil {
		t.Fatal("expected err")
	}
}

func TestWalker(t *testing.T) {
	v, _ := Parse(`{"a":[1,2],"b":{"c":3}}`)
	count := CountNodes(v)
	if count < 5 {
		t.Fatalf("count %d", count)
	}
}

func TestFindAll(t *testing.T) {
	v, _ := Parse(`{"a":1,"b":2,"c":[1]}`)
	paths := FindAll(v, func(node *Value) bool { return node != nil && node.Type == TypeNumber })
	if len(paths) != 3 {
		t.Fatalf("paths %v", paths)
	}
}

func TestGetMissing(t *testing.T) {
	v, _ := Parse(`{"x":1}`)
	if v.Get("missing") != nil {
		t.Fatal("expected nil")
	}
}
