package environ

import (
	"sort"
	"testing"
)

type testVal struct{ v string }

func (tv *testVal) Type() string    { return "test" }
func (tv *testVal) Inspect() string { return tv.v }

func val(s string) Value { return &testVal{v: s} }

func TestSetAndGet(t *testing.T) {
	env := New()
	env.Set("x", val("42"), false)
	v, ok := env.Get("x")
	if !ok {
		t.Fatal("expected to find 'x'")
	}
	if v.Inspect() != "42" {
		t.Errorf("expected '42', got %q", v.Inspect())
	}
}

func TestGetUndefined(t *testing.T) {
	env := New()
	_, ok := env.Get("nope")
	if ok {
		t.Error("expected not found")
	}
}

func TestEnclosedEnv(t *testing.T) {
	outer := New()
	outer.Set("x", val("outer"), false)
	inner := NewEnclosed(outer)
	v, ok := inner.Get("x")
	if !ok {
		t.Fatal("expected to find 'x' in parent")
	}
	if v.Inspect() != "outer" {
		t.Errorf("expected 'outer', got %q", v.Inspect())
	}
}

func TestShadowing(t *testing.T) {
	outer := New()
	outer.Set("x", val("outer"), false)
	inner := NewEnclosed(outer)
	inner.Set("x", val("inner"), false)
	v, _ := inner.Get("x")
	if v.Inspect() != "inner" {
		t.Errorf("expected 'inner', got %q", v.Inspect())
	}
	v2, _ := outer.Get("x")
	if v2.Inspect() != "outer" {
		t.Errorf("outer should still be 'outer', got %q", v2.Inspect())
	}
}

func TestUpdateMutable(t *testing.T) {
	env := New()
	env.Set("x", val("1"), true)
	err := env.Update("x", val("2"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	v, _ := env.Get("x")
	if v.Inspect() != "2" {
		t.Errorf("expected '2', got %q", v.Inspect())
	}
}

func TestUpdateImmutable(t *testing.T) {
	env := New()
	env.Set("x", val("1"), false)
	err := env.Update("x", val("2"))
	if err == nil {
		t.Fatal("expected error for immutable update")
	}
}

func TestUpdateUndefined(t *testing.T) {
	env := New()
	err := env.Update("x", val("1"))
	if err == nil {
		t.Fatal("expected error for undefined variable")
	}
}

func TestUpdateParent(t *testing.T) {
	outer := New()
	outer.Set("x", val("1"), true)
	inner := NewEnclosed(outer)
	err := inner.Update("x", val("2"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	v, _ := outer.Get("x")
	if v.Inspect() != "2" {
		t.Errorf("expected '2' in outer, got %q", v.Inspect())
	}
}

func TestHas(t *testing.T) {
	env := New()
	env.Set("x", val("1"), false)
	if !env.Has("x") {
		t.Error("expected Has('x') = true")
	}
	if env.Has("y") {
		t.Error("expected Has('y') = false")
	}
}

func TestHasLocal(t *testing.T) {
	outer := New()
	outer.Set("x", val("1"), false)
	inner := NewEnclosed(outer)
	if inner.HasLocal("x") {
		t.Error("expected HasLocal('x') = false in inner")
	}
	if !inner.Has("x") {
		t.Error("expected Has('x') = true in inner (from parent)")
	}
}

func TestDepth(t *testing.T) {
	env := New()
	if env.Depth() != 0 {
		t.Errorf("expected depth 0, got %d", env.Depth())
	}
	inner := NewEnclosed(env)
	if inner.Depth() != 1 {
		t.Errorf("expected depth 1, got %d", inner.Depth())
	}
	inner2 := NewEnclosed(inner)
	if inner2.Depth() != 2 {
		t.Errorf("expected depth 2, got %d", inner2.Depth())
	}
}

func TestLocalNames(t *testing.T) {
	env := New()
	env.Set("a", val("1"), false)
	env.Set("b", val("2"), false)
	names := env.LocalNames()
	sort.Strings(names)
	if len(names) != 2 || names[0] != "a" || names[1] != "b" {
		t.Errorf("expected [a, b], got %v", names)
	}
}

func TestAllNames(t *testing.T) {
	outer := New()
	outer.Set("x", val("1"), false)
	inner := NewEnclosed(outer)
	inner.Set("y", val("2"), false)
	names := inner.AllNames()
	sort.Strings(names)
	if len(names) != 2 || names[0] != "x" || names[1] != "y" {
		t.Errorf("expected [x, y], got %v", names)
	}
}

func TestAllNamesShadowed(t *testing.T) {
	outer := New()
	outer.Set("x", val("1"), false)
	inner := NewEnclosed(outer)
	inner.Set("x", val("2"), false)
	names := inner.AllNames()
	if len(names) != 1 || names[0] != "x" {
		t.Errorf("expected [x], got %v", names)
	}
}

func TestClone(t *testing.T) {
	env := New()
	env.Set("x", val("1"), true)
	clone := env.Clone()
	clone.Update("x", val("2"))
	v1, _ := env.Get("x")
	v2, _ := clone.Get("x")
	if v1.Inspect() != "1" {
		t.Errorf("original should be '1', got %q", v1.Inspect())
	}
	if v2.Inspect() != "2" {
		t.Errorf("clone should be '2', got %q", v2.Inspect())
	}
}

func TestSize(t *testing.T) {
	outer := New()
	outer.Set("a", val("1"), false)
	inner := NewEnclosed(outer)
	inner.Set("b", val("2"), false)
	inner.Set("c", val("3"), false)
	if inner.Size() != 3 {
		t.Errorf("expected size 3, got %d", inner.Size())
	}
	if inner.LocalSize() != 2 {
		t.Errorf("expected local size 2, got %d", inner.LocalSize())
	}
}

func TestDelete(t *testing.T) {
	env := New()
	env.Set("x", val("1"), false)
	ok := env.Delete("x")
	if !ok {
		t.Error("expected delete to succeed")
	}
	if env.Has("x") {
		t.Error("expected 'x' to be deleted")
	}
	ok2 := env.Delete("nope")
	if ok2 {
		t.Error("expected delete of nonexistent to return false")
	}
}

func TestMerge(t *testing.T) {
	e1 := New()
	e1.Set("a", val("1"), false)
	e2 := New()
	e2.Set("b", val("2"), false)
	e2.Set("c", val("3"), false)
	e1.Merge(e2)
	if e1.LocalSize() != 3 {
		t.Errorf("expected 3 bindings, got %d", e1.LocalSize())
	}
}

func TestDump(t *testing.T) {
	env := New()
	env.Set("x", val("42"), true)
	dump := env.Dump()
	if dump == "" {
		t.Error("expected non-empty dump")
	}
}

func TestGetBinding(t *testing.T) {
	env := New()
	env.Set("x", val("1"), true)
	b, ok := env.GetBinding("x")
	if !ok {
		t.Fatal("expected to find binding")
	}
	if !b.Mutable {
		t.Error("expected mutable binding")
	}
}

func TestParent(t *testing.T) {
	outer := New()
	inner := NewEnclosed(outer)
	if inner.Parent() != outer {
		t.Error("expected parent to be outer")
	}
	if outer.Parent() != nil {
		t.Error("expected root parent to be nil")
	}
}
