package engine

import (
	"context"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestReplayActivityStateTransitions(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 12, 10, 0, 0, 0, 0, time.UTC))
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
		Kind:             decision.KindScheduleActivity,
		ScheduleActivity: &decision.ScheduleActivity{ActivityType: "X", TaskQueue: "default"},
	}})
	at, _, _ := e.PollActivityTask(ctx, "default", "w1", time.Minute)
	_ = e.CompleteActivityTask(ctx, at.TaskID, exec, at.ActivityID, types.Payload{}, nil)

	d, err := e.Replay(ctx, exec)
	if err != nil {
		t.Fatal(err)
	}
	if d.Activities[at.ActivityID] != types.ActivityCompleted {
		t.Fatalf("activity status = %s", d.Activities[at.ActivityID])
	}
	if d.Status != types.WorkflowRunning {
		t.Fatalf("status = %s", d.Status)
	}
}

func TestReplayTimers(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 12, 10, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()
	exec, _ := e.StartWorkflow(ctx, StartRequest{
		WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default",
	})
	dt, _, _ := store.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Minute)
	_ = e.CompleteDecisionTask(ctx, dt.ID, exec, []decision.Decision{{
		Kind:       decision.KindStartTimer,
		StartTimer: &decision.StartTimer{TimerID: "t1", Duration: time.Second},
	}})

	d, _ := e.Replay(ctx, exec)
	if fired, ok := d.Timers["t1"]; !ok || fired {
		t.Fatalf("timer state: %+v", d.Timers)
	}

	fc.Advance(2 * time.Second)
	_, _ = e.TickTimers(ctx, 0)
	d, _ = e.Replay(ctx, exec)
	if !d.Timers["t1"] {
		t.Fatal("timer should be marked fired after TickTimers")
	}
}
