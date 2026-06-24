package engine

import (
	"context"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
)

func TestPendingTaskCountTracksLifecycle(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()

	if n, _ := store.PendingTasks(ctx, "", ""); n != 0 {
		t.Fatalf("initial pending = %d", n)
	}
	_, _ = e.StartWorkflow(ctx, StartRequest{WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default"})
	if n, _ := store.PendingTasks(ctx, storage.TaskDecision, "default"); n != 1 {
		t.Fatalf("after start, decision pending = %d", n)
	}
	t1, _, _ := store.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Minute)
	_ = store.CompleteTask(ctx, t1.ID)
	if n, _ := store.PendingTasks(ctx, "", ""); n != 0 {
		t.Fatalf("after complete, pending = %d", n)
	}
}
