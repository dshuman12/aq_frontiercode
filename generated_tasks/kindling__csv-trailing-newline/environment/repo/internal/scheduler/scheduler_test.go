package scheduler

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

func TestRunsTasks(t *testing.T) {
	s := New(1)
	var n int32
	s.Add(Task{
		Name:     "tick",
		Interval: 10 * time.Millisecond,
		Run:      func(ctx context.Context) error { atomic.AddInt32(&n, 1); return nil },
	})
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Millisecond)
	defer cancel()
	s.Run(ctx)
	if atomic.LoadInt32(&n) < 2 {
		t.Fatalf("expected multiple ticks, got %d", n)
	}
}

func TestNames(t *testing.T) {
	s := New(2)
	s.Add(Task{Name: "a"})
	s.Add(Task{Name: "b"})
	names := s.Names()
	if len(names) != 2 || names[0] != "a" || names[1] != "b" {
		t.Fatalf("names %v", names)
	}
}
