package engine

import (
	"context"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestActivityTimeoutSweepExpires(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 12, 5, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()

	exec, _ := e.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf",
		WorkflowType: "T",
		TaskQueue:    "default",
	})
	dt, _, _ := store.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Minute)
	_ = e.CompleteDecisionTask(ctx, dt.ID, exec, []decision.Decision{{
		Kind: decision.KindScheduleActivity,
		ScheduleActivity: &decision.ScheduleActivity{
			ActivityType: "X", TaskQueue: "default",
			Options: types.ActivityOptions{ScheduleToCloseTimeout: 30 * time.Second},
		},
	}})

	fc.Advance(45 * time.Second)
	n, err := e.ActivityTimeoutSweep(ctx, 0)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("expected 1 timeout, got %d", n)
	}
	hist, _ := store.GetHistory(ctx, exec, 0, 0)
	var sawTimeout bool
	for _, ev := range hist {
		if ev.Kind == history.ActivityTimedOutKind {
			sawTimeout = true
		}
	}
	if !sawTimeout {
		t.Fatal("ActivityTimedOut not in history")
	}
}
