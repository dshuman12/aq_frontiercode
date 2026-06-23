package engine

import (
	"context"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestTimeoutSweepClosesOldRuns(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 10, 25, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()

	exec, _ := e.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf",
		WorkflowType: "T",
		TaskQueue:    "default",
		Options: types.WorkflowOptions{
			RunTimeout: 30 * time.Second,
		},
	})

	fc.Advance(45 * time.Second)
	n, err := e.TimeoutSweep(ctx, 0)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("expected 1 timeout, got %d", n)
	}
	rec, _ := store.GetWorkflow(ctx, types.DefaultNamespace, exec)
	if rec.Status != types.WorkflowTimedOut {
		t.Fatalf("status = %s", rec.Status)
	}
}

func TestTimeoutSweepIgnoresUnbounded(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 10, 25, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()

	_, _ = e.StartWorkflow(ctx, StartRequest{WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default"})
	fc.Advance(24 * time.Hour)
	n, _ := e.TimeoutSweep(ctx, 0)
	if n != 0 {
		t.Fatalf("expected 0 timeouts for unbounded run, got %d", n)
	}
}
