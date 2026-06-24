package asyncqueue

import (
	"context"
	"testing"
	"time"
)

func TestSubmitTake(t *testing.T) {
	q := New[int](Options{Max: 4})
	for i := 0; i < 3; i++ {
		if err := q.Submit(i); err != nil {
			t.Fatal(err)
		}
	}
	for i := 0; i < 3; i++ {
		v, err := q.Take(context.Background())
		if err != nil || v != i {
			t.Fatalf("got %d %v", v, err)
		}
	}
}

func TestErrFull(t *testing.T) {
	q := New[int](Options{Max: 2})
	_ = q.Submit(1)
	_ = q.Submit(2)
	if err := q.Submit(3); err != ErrFull {
		t.Fatalf("got %v", err)
	}
}

func TestDropOldest(t *testing.T) {
	q := New[int](Options{Max: 2, DropOldest: true})
	_ = q.Submit(1)
	_ = q.Submit(2)
	_ = q.Submit(3)
	if q.Dropped() != 1 {
		t.Fatalf("dropped %d", q.Dropped())
	}
	v, _ := q.Take(context.Background())
	if v != 2 {
		t.Fatalf("expected 2, got %d", v)
	}
}

func TestDrain(t *testing.T) {
	q := New[int](Options{Max: 16})
	for i := 0; i < 5; i++ {
		_ = q.Submit(i)
	}
	got := q.Drain(3)
	if len(got) != 3 || got[0] != 0 || got[2] != 2 {
		t.Fatalf("got %v", got)
	}
}

func TestTakeContext(t *testing.T) {
	q := New[int](Options{Max: 2})
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	_, err := q.Take(ctx)
	if err == nil {
		t.Fatal("expected ctx err")
	}
}

func TestClose(t *testing.T) {
	q := New[int](Options{Max: 2})
	q.Close()
	if err := q.Submit(1); err == nil {
		t.Fatal("expected closed err")
	}
}
