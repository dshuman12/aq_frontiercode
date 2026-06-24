package asyncbatch

import (
	"sync"
	"testing"
	"time"
)

func TestFlushOnSize(t *testing.T) {
	var mu sync.Mutex
	delivered := map[string]int{}
	flush := func(k string, batch []any) error {
		mu.Lock()
		delivered[k] += len(batch)
		mu.Unlock()
		return nil
	}
	b := New(Config{Size: 3, Interval: time.Hour, Flush: flush})
	for i := 0; i < 5; i++ {
		_ = b.Submit("a", i)
	}
	mu.Lock()
	defer mu.Unlock()
	if delivered["a"] != 3 {
		t.Fatalf("delivered %d", delivered["a"])
	}
}

func TestTick(t *testing.T) {
	got := 0
	flush := func(k string, batch []any) error { got += len(batch); return nil }
	b := New(Config{Size: 100, Interval: time.Second, Flush: flush})
	now := time.Now()
	b.SetClock(func() time.Time { return now })
	_ = b.Submit("k", 1)
	if got != 0 {
		t.Fatalf("delivered too soon")
	}
	now = now.Add(2 * time.Second)
	_ = b.Tick()
	if got != 1 {
		t.Fatalf("got %d", got)
	}
}

func TestFlushAll(t *testing.T) {
	got := 0
	flush := func(k string, batch []any) error { got += len(batch); return nil }
	b := New(Config{Size: 10, Interval: time.Hour, Flush: flush})
	_ = b.Submit("a", 1)
	_ = b.Submit("b", 2)
	if err := b.Flush(); err != nil {
		t.Fatal(err)
	}
	if got != 2 {
		t.Fatalf("got %d", got)
	}
}

func TestStop(t *testing.T) {
	b := New(Config{Size: 10, Interval: time.Hour, Flush: func(string, []any) error { return nil }})
	_ = b.Stop()
	if err := b.Submit("a", 1); err == nil {
		t.Fatal("expected stopped err")
	}
}

func TestPending(t *testing.T) {
	b := New(Config{Size: 10, Interval: time.Hour, Flush: func(string, []any) error { return nil }})
	_ = b.Submit("a", 1)
	_ = b.Submit("b", 1)
	if b.Pending() != 2 {
		t.Fatalf("pending %d", b.Pending())
	}
}
