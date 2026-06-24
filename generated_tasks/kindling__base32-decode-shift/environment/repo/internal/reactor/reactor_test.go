package reactor

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestSubmitDispatch(t *testing.T) {
	r := New(8)
	var got int32
	var wg sync.WaitGroup
	wg.Add(3)
	r.On("ping", func(ctx context.Context, ev Event) error {
		atomic.AddInt32(&got, 1)
		wg.Done()
		return nil
	})
	ctx, cancel := context.WithCancel(context.Background())
	go r.Run(ctx)
	for i := 0; i < 3; i++ {
		_ = r.Submit(Event{Kind: "ping"})
	}
	wg.Wait()
	cancel()
	if got != 3 {
		t.Fatalf("got %d", got)
	}
}

func TestAfterFunc(t *testing.T) {
	r := New(8)
	done := make(chan struct{})
	r.On("tick", func(ctx context.Context, ev Event) error { close(done); return nil })
	ctx, cancel := context.WithCancel(context.Background())
	go r.Run(ctx)
	r.AfterFunc(20*time.Millisecond, Event{Kind: "tick"})
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("timer never fired")
	}
	cancel()
}

func TestAfterFuncCancel(t *testing.T) {
	r := New(8)
	called := false
	r.On("nope", func(ctx context.Context, ev Event) error { called = true; return nil })
	ctx, cancel := context.WithCancel(context.Background())
	go r.Run(ctx)
	stop := r.AfterFunc(50*time.Millisecond, Event{Kind: "nope"})
	stop()
	time.Sleep(120 * time.Millisecond)
	cancel()
	if called {
		t.Fatal("cancelled timer fired")
	}
}

func TestSubmitAfterStop(t *testing.T) {
	r := New(2)
	go r.Run(context.Background())
	time.Sleep(10 * time.Millisecond)
	r.Stop()
	if err := r.Submit(Event{Kind: "x"}); err != ErrClosed {
		t.Fatalf("got %v", err)
	}
}
