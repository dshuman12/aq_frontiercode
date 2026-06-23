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

func TestActivityFailureRetriesUnderPolicy(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC))
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
			ActivityType: "Flaky",
			TaskQueue:    "default",
			Options: types.ActivityOptions{
				Retry: types.RetryPolicy{
					InitialInterval:    time.Millisecond * 100,
					BackoffCoefficient: 2,
					MaxAttempts:        3,
				},
			},
		},
	}})

	// Poll and fail the activity.
	at, _, _ := e.PollActivityTask(ctx, "default", "w1", time.Minute)
	fail := &types.Failure{Type: types.FailureApplication, Message: "boom"}
	if err := e.CompleteActivityTask(ctx, at.TaskID, exec, at.ActivityID, types.Payload{}, fail); err != nil {
		t.Fatal(err)
	}

	// History should NOT yet contain ActivityFailedKind — we retried.
	hist, _ := store.GetHistory(ctx, exec, 0, 0)
	for _, ev := range hist {
		if ev.Kind == history.ActivityFailedKind {
			t.Fatalf("activity failed event written too early")
		}
	}

	// The task should be re-queued. After backoff, it becomes visible.
	fc.Advance(200 * time.Millisecond)
	if _, ok, _ := store.DequeueTask(ctx, storage.TaskActivity, "default", "w2", time.Minute); !ok {
		t.Fatal("retry task should be visible after backoff")
	}
}

func TestActivityFinalFailureWritesEvent(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()

	exec, _ := e.StartWorkflow(ctx, StartRequest{WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default"})
	dt, _, _ := store.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Minute)
	_ = e.CompleteDecisionTask(ctx, dt.ID, exec, []decision.Decision{{
		Kind: decision.KindScheduleActivity,
		ScheduleActivity: &decision.ScheduleActivity{
			ActivityType: "OneShot",
			TaskQueue:    "default",
			// zero retry policy => no retries
		},
	}})

	at, _, _ := e.PollActivityTask(ctx, "default", "w1", time.Minute)
	fail := &types.Failure{Type: types.FailureApplication, Message: "permanent"}
	if err := e.CompleteActivityTask(ctx, at.TaskID, exec, at.ActivityID, types.Payload{}, fail); err != nil {
		t.Fatal(err)
	}

	hist, _ := store.GetHistory(ctx, exec, 0, 0)
	last := hist[len(hist)-1]
	if last.Kind != history.ActivityFailedKind {
		t.Fatalf("last event %s", last.Kind)
	}
}
