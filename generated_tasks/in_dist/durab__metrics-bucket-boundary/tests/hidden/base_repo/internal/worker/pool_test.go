package worker

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/internal/wasm"
)

func TestWorkerRunExitsOnCtxCancel(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	fc := clock.NewFake(time.Date(2026, 5, 9, 0, 0, 0, 0, time.UTC))
	eng := engine.New(storage.NewMemoryWithClock(fc), fc, log.Default)
	rt := wasm.NewRuntime(ctx, log.Default)
	defer rt.Close(context.Background())
	w := New(eng, rt, Options{ID: "w", Log: log.Default})

	done := make(chan error, 1)
	go func() { done <- w.Run(ctx, "default", 5*time.Millisecond) }()
	time.Sleep(20 * time.Millisecond)
	cancel()
	select {
	case err := <-done:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("got %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("Run did not exit")
	}
}

func TestWorkerRunPoolN(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	fc := clock.NewFake(time.Date(2026, 5, 9, 0, 0, 0, 0, time.UTC))
	eng := engine.New(storage.NewMemoryWithClock(fc), fc, log.Default)
	rt := wasm.NewRuntime(ctx, log.Default)
	defer rt.Close(context.Background())
	w := New(eng, rt, Options{ID: "w", Log: log.Default})

	done := make(chan error, 1)
	go func() { done <- w.RunPool(ctx, "default", 3, 5*time.Millisecond) }()
	time.Sleep(20 * time.Millisecond)
	cancel()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("RunPool did not exit")
	}
}
