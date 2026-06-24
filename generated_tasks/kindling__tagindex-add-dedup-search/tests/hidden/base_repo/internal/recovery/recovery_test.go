package recovery

import (
	"strings"
	"sync"
	"testing"
)

func TestRecover(t *testing.T) {
	r := New()
	got := r.Run("worker", func() { panic("boom") })
	if !got {
		t.Fatal("expected recover")
	}
	last := r.Last()
	if last == nil || last.Goroutine != "worker" {
		t.Fatalf("got %+v", last)
	}
}

func TestNoPanic(t *testing.T) {
	r := New()
	if r.Run("ok", func() {}) {
		t.Fatal("unexpected recover")
	}
	if r.Count() != 0 {
		t.Fatalf("count %d", r.Count())
	}
}

func TestHandler(t *testing.T) {
	r := New()
	var seen string
	r.SetHandler(func(info PanicInfo) { seen = info.Goroutine })
	_ = r.Run("hooked", func() { panic("oops") })
	if seen != "hooked" {
		t.Fatalf("got %s", seen)
	}
}

func TestGoConcurrent(t *testing.T) {
	r := New()
	var wg sync.WaitGroup
	for i := 0; i < 5; i++ {
		wg.Add(1)
		r.SetHandler(func(PanicInfo) { wg.Done() })
		r.Go("g", func() { panic("x") })
	}
	wg.Wait()
	if r.Count() != 5 {
		t.Fatalf("count %d", r.Count())
	}
}

func TestFormat(t *testing.T) {
	out := Format(PanicInfo{Goroutine: "g", Value: "v", Stack: []byte("trace")})
	if !strings.Contains(out, "panic in g") {
		t.Fatalf("got %s", out)
	}
}
