package engine

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestPollDecisionTaskDirect(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 11, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()

	exec, _ := e.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf",
		WorkflowType: "T",
		TaskQueue:    "default",
	})
	task, ok, err := e.PollDecisionTask(ctx, "default", "w1", time.Minute)
	if err != nil || !ok {
		t.Fatalf("poll: ok=%v err=%v", ok, err)
	}
	if task.Execution != exec || task.WorkflowType != "T" {
		t.Fatalf("task: %+v", task)
	}
	if len(task.History) < 1 {
		t.Fatal("expected history attached")
	}
}

func TestPollDecisionTaskIdle(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 11, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	_, ok, err := e.PollDecisionTask(context.Background(), "default", "w1", time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Fatal("expected idle")
	}
}

func TestNextActivityIDProgresses(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 11, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()
	exec, _ := e.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf",
		WorkflowType: "T",
		TaskQueue:    "default",
	})
	dt, _, _ := store.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Minute)
	_ = e.CompleteDecisionTask(ctx, dt.ID, exec, []decision.Decision{
		{Kind: decision.KindScheduleActivity, ScheduleActivity: &decision.ScheduleActivity{ActivityType: "A", TaskQueue: "default"}},
		{Kind: decision.KindScheduleActivity, ScheduleActivity: &decision.ScheduleActivity{ActivityType: "B", TaskQueue: "default"}},
	})
	next := nextActivityID(ctx, store, exec)
	if next != 3 {
		t.Fatalf("nextActivityID = %d, want 3", next)
	}
}

func TestStartRejectsMissingFields(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 11, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	ctx := context.Background()
	_, err := e.StartWorkflow(ctx, StartRequest{WorkflowType: "T", TaskQueue: "default"})
	if !errors.Is(err, errs.Invalid) {
		t.Fatalf("missing id: %v", err)
	}
	_, err = e.StartWorkflow(ctx, StartRequest{WorkflowID: "wf", TaskQueue: "default"})
	if !errors.Is(err, errs.Invalid) {
		t.Fatalf("missing type: %v", err)
	}
}

func TestStartWithIdempotencyHits(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 11, 0, 0, 0, 0, time.UTC))
	e := New(storage.NewMemoryWithClock(fc), fc, log.Default)
	e.SetIdempotencyCache(NewIdempotencyCache(time.Hour))
	ctx := context.Background()
	exec1, _ := e.StartWorkflow(ctx, StartRequest{
		WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default", IdempotencyKey: "k1",
	})
	exec2, _ := e.StartWorkflow(ctx, StartRequest{
		WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default", IdempotencyKey: "k1",
	})
	if exec1 != exec2 {
		t.Fatalf("idempotent miss: %v vs %v", exec1, exec2)
	}
}

func TestPollActivityMissingScheduledEvent(t *testing.T) {
	fc := clock.NewFake(time.Date(2026, 5, 11, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()
	_ = store.CreateWorkflow(ctx, storage.WorkflowRecord{
		Namespace:    types.DefaultNamespace,
		Execution:    types.Execution{WorkflowID: "x", RunID: "y"},
		WorkflowType: "T", TaskQueue: "default", Status: types.WorkflowRunning,
	})
	_, _ = store.EnqueueTask(ctx, storage.Task{
		Kind:      storage.TaskActivity,
		Namespace: types.DefaultNamespace,
		TaskQueue: "default",
		Execution: types.Execution{WorkflowID: "x", RunID: "y"},
		EventID:   42,
	})
	_, _, err := e.PollActivityTask(ctx, "default", "w1", time.Minute)
	if !errors.Is(err, errs.NotFound) {
		t.Fatalf("err = %v", err)
	}
}
