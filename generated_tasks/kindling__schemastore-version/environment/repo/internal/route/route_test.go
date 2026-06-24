package route

import "testing"

func TestStatic(t *testing.T) {
	r := New()
	called := false
	r.Add("/health", func(p map[string]string) { called = true })
	if err := r.Dispatch("/health"); err != nil {
		t.Fatal(err)
	}
	if !called {
		t.Fatal("not called")
	}
}

func TestParam(t *testing.T) {
	r := New()
	var got string
	r.Add("/jobs/:id", func(p map[string]string) { got = p["id"] })
	if err := r.Dispatch("/jobs/abc"); err != nil {
		t.Fatal(err)
	}
	if got != "abc" {
		t.Fatalf("got %q", got)
	}
}

func TestNested(t *testing.T) {
	r := New()
	var id, run string
	r.Add("/jobs/:id/runs/:run", func(p map[string]string) {
		id, run = p["id"], p["run"]
	})
	if err := r.Dispatch("/jobs/x1/runs/77"); err != nil {
		t.Fatal(err)
	}
	if id != "x1" || run != "77" {
		t.Fatalf("got %q %q", id, run)
	}
}

func TestNoMatch(t *testing.T) {
	r := New()
	r.Add("/a", func(map[string]string) {})
	if err := r.Dispatch("/b"); err != ErrNoMatch {
		t.Fatalf("got %v", err)
	}
}

func TestRoot(t *testing.T) {
	r := New()
	called := false
	r.Add("/", func(map[string]string) { called = true })
	if err := r.Dispatch("/"); err != nil {
		t.Fatal(err)
	}
	if !called {
		t.Fatal("root not called")
	}
}
