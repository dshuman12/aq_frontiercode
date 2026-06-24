package engine

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
)

func TestTickLoopExitsOnCtxCancel(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 8, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- e.TickLoop(ctx, 10*time.Millisecond) }()
	time.Sleep(20 * time.Millisecond)
	cancel()
	select {
	case err := <-done:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("got %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("TickLoop did not exit")
	}
}

func TestScheduleLoopExitsOnCtxCancel(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 8, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- e.ScheduleLoop(ctx, 10*time.Millisecond) }()
	time.Sleep(20 * time.Millisecond)
	cancel()
	select {
	case err := <-done:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("got %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("ScheduleLoop did not exit")
	}
}

func TestTimeoutLoopExitsOnCtxCancel(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 8, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- e.TimeoutLoop(ctx, 10*time.Millisecond) }()
	time.Sleep(20 * time.Millisecond)
	cancel()
	select {
	case err := <-done:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("got %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("TimeoutLoop did not exit")
	}
}

func TestActivityTimeoutLoopExitsOnCtxCancel(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 8, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- e.ActivityTimeoutLoop(ctx, 10*time.Millisecond) }()
	time.Sleep(20 * time.Millisecond)
	cancel()
	select {
	case err := <-done:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("got %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("ActivityTimeoutLoop did not exit")
	}
}

func TestEngineDescribeWorkflow(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 8, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	ctx := context.Background()
	exec, _ := e.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf",
		WorkflowType: "T",
		TaskQueue:    "default",
	})
	info, err := e.DescribeWorkflow(ctx, "default", exec)
	if err != nil {
		t.Fatal(err)
	}
	if info.WorkflowType != "T" || info.HistoryLength < 1 {
		t.Fatalf("info: %+v", info)
	}
}

func TestEngineGetHistoryRange(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 8, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()
	exec, _ := e.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf",
		WorkflowType: "T",
		TaskQueue:    "default",
	})
	hist, err := e.GetHistory(ctx, exec, 1, 1)
	if err != nil {
		t.Fatal(err)
	}
	if len(hist) != 1 {
		t.Fatalf("history len %d", len(hist))
	}
}
