package bulkhead

import (
	"context"
	"sync"
	"testing"
	"time"
)

func TestSubmit(t *testing.T) {
	b := New(2)
	called := false
	if err := b.Submit(func() error { called = true; return nil }); err != nil {
		t.Fatal(err)
	}
	if !called {
		t.Fatal("not called")
	}
}

func TestRejectsWhenFull(t *testing.T) {
	b := New(1)
	hold := make(chan struct{})
	go b.Submit(func() error { <-hold; return nil })
	time.Sleep(10 * time.Millisecond)
	if err := b.Submit(func() error { return nil }); err != ErrFull {
		t.Fatalf("got %v", err)
	}
	close(hold)
}

func TestSubmitContextCancels(t *testing.T) {
	b := New(1)
	hold := make(chan struct{})
	go b.Submit(func() error { <-hold; return nil })
	time.Sleep(10 * time.Millisecond)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()
	if err := b.SubmitContext(ctx, func() error { return nil }); err == nil {
		t.Fatal("expected ctx err")
	}
	close(hold)
}

func TestStats(t *testing.T) {
	b := New(2)
	var wg sync.WaitGroup
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = b.Submit(func() error { return nil })
		}()
	}
	wg.Wait()
	s := b.Stats()
	if s.Served+s.Rejected != 5 {
		t.Fatalf("stats %+v", s)
	}
}
