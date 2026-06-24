package coalesce

import (
	"sync"
	"testing"
	"time"
)

func TestCoalesce(t *testing.T) {
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	var (
		mu      sync.Mutex
		summary Summary
		seen    bool
	)
	c := New(time.Second, func(s Summary) {
		mu.Lock()
		summary = s
		seen = true
		mu.Unlock()
	})
	c.SetClock(func() time.Time { return now })
	for i := 0; i < 5; i++ {
		c.Add("k", i)
	}
	if c.Pending() != 1 {
		t.Fatalf("pending %d", c.Pending())
	}
	if c.Tick() != 0 {
		t.Fatal("nothing should flush yet")
	}
	now = now.Add(2 * time.Second)
	if c.Tick() != 1 {
		t.Fatal("expected one flush")
	}
	mu.Lock()
	defer mu.Unlock()
	if !seen || summary.Count != 5 {
		t.Fatalf("got %+v", summary)
	}
}

func TestFlush(t *testing.T) {
	c := New(time.Hour, func(Summary) {})
	c.Add("a", 1)
	c.Add("b", 2)
	if c.Flush() != 2 {
		t.Fatal("expected two")
	}
	if c.Pending() != 0 {
		t.Fatal("expected drained")
	}
}
