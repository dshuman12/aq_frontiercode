package engine

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

var epoch = time.Date(2025, 7, 1, 0, 0, 0, 0, time.UTC)

func newEngine(t *testing.T) (*Engine, *storage.Memory, *clock.Fake) {
	t.Helper()
	fc := clock.NewFake(epoch)
	m := storage.NewMemoryWithClock(fc)
	return New(m, fc, log.Default), m, fc
}

func TestStartWorkflowAppendsStartedEvent(t *testing.T) {
	e, m, _ := newEngine(t)
	ctx := context.Background()
	exec, err := e.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf-1",
		WorkflowType: "Greet",
		TaskQueue:    "default",
	})
	if err != nil {
		t.Fatal(err)
	}
	hist, _ := m.GetHistory(ctx, exec, 0, 0)
	if len(hist) != 1 || hist[0].Kind != history.WorkflowStarted {
		t.Fatalf("started event missing: %+v", hist)
	}
}

func TestStartWorkflowEnqueuesDecisionTask(t *testing.T) {
	e, m, _ := newEngine(t)
	ctx := context.Background()
	exec, err := e.StartWorkflow(ctx, StartRequest{WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default"})
	if err != nil {
		t.Fatal(err)
	}
	task, ok, err := m.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Minute)
	if err != nil || !ok {
		t.Fatalf("dequeue: ok=%v err=%v", ok, err)
	}
	if task.Execution != exec {
		t.Fatalf("task exec %+v", task.Execution)
	}
}

func TestSignalWorkflowAppendsAndEnqueues(t *testing.T) {
	e, m, _ := newEngine(t)
	ctx := context.Background()
	exec, _ := e.StartWorkflow(ctx, StartRequest{WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default"})

	_, _, _ = m.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Second)

	if err := e.SignalWorkflow(ctx, types.DefaultNamespace, exec, "ping", types.Payload{}); err != nil {
		t.Fatal(err)
	}
	hist, _ := m.GetHistory(ctx, exec, 0, 0)
	if len(hist) != 2 || hist[1].Kind != history.SignalReceived {
		t.Fatalf("signal event missing: %+v", hist)
	}
	if _, ok, _ := m.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Second); !ok {
		t.Fatal("expected decision task after signal")
	}
}

func TestSignalRejectsTerminated(t *testing.T) {
	e, m, _ := newEngine(t)
	ctx := context.Background()
	exec, _ := e.StartWorkflow(ctx, StartRequest{WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default"})
	_ = m.UpdateWorkflowStatus(ctx, types.DefaultNamespace, exec, types.WorkflowCompleted, epoch)
	err := e.SignalWorkflow(ctx, types.DefaultNamespace, exec, "x", types.Payload{})
	if !errors.Is(err, errs.Conflict) {
		t.Fatalf("want Conflict, got %v", err)
	}
}

func TestCompleteDecisionScheduleActivity(t *testing.T) {
	e, m, _ := newEngine(t)
	ctx := context.Background()
	exec, _ := e.StartWorkflow(ctx, StartRequest{WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default"})
	task, _, _ := m.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Minute)

	in, _ := types.NewJSONPayload(map[string]any{"x": 1})
	err := e.CompleteDecisionTask(ctx, task.ID, exec, []decision.Decision{{
		Kind: decision.KindScheduleActivity,
		ScheduleActivity: &decision.ScheduleActivity{
			ActivityType: "DoThing",
			TaskQueue:    "default",
			Input:        in,
		},
	}})
	if err != nil {
		t.Fatal(err)
	}
	hist, _ := m.GetHistory(ctx, exec, 0, 0)
	if len(hist) != 2 || hist[1].Kind != history.ActivityScheduledKind {
		t.Fatalf("activity scheduled missing: %+v", hist)
	}

	at, ok, _ := m.DequeueTask(ctx, storage.TaskActivity, "default", "w1", time.Minute)
	if !ok || at.ActivityID != 1 {
		t.Fatalf("activity task: ok=%v aid=%d", ok, at.ActivityID)
	}
}

func TestCompleteDecisionFinishesWorkflow(t *testing.T) {
	e, m, _ := newEngine(t)
	ctx := context.Background()
	exec, _ := e.StartWorkflow(ctx, StartRequest{WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default"})
	task, _, _ := m.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Minute)

	res, _ := types.NewJSONPayload("done")
	err := e.CompleteDecisionTask(ctx, task.ID, exec, []decision.Decision{{
		Kind:             decision.KindCompleteWorkflow,
		CompleteWorkflow: &decision.CompleteWorkflow{Result: res},
	}})
	if err != nil {
		t.Fatal(err)
	}
	rec, _ := m.GetWorkflow(ctx, types.DefaultNamespace, exec)
	if rec.Status != types.WorkflowCompleted {
		t.Fatalf("status not completed: %s", rec.Status)
	}
}

func TestTimerFiresEnqueuesDecision(t *testing.T) {
	e, m, fc := newEngine(t)
	ctx := context.Background()
	exec, _ := e.StartWorkflow(ctx, StartRequest{WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default"})
	task, _, _ := m.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Minute)
	_ = e.CompleteDecisionTask(ctx, task.ID, exec, []decision.Decision{{
		Kind:       decision.KindStartTimer,
		StartTimer: &decision.StartTimer{TimerID: "t1", Duration: time.Minute},
	}})

	if n, _ := e.TickTimers(ctx, 0); n != 0 {
		t.Fatalf("no timer should fire yet, got %d", n)
	}
	fc.Advance(time.Minute)
	if n, _ := e.TickTimers(ctx, 0); n != 1 {
		t.Fatalf("expected 1 timer fired, got %d", n)
	}
	if _, ok, _ := m.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Second); !ok {
		t.Fatal("expected decision task after timer")
	}
	hist, _ := m.GetHistory(ctx, exec, 0, 0)
	last := hist[len(hist)-1]
	if last.Kind != history.TimerFired {
		t.Fatalf("last event kind %s", last.Kind)
	}
}

func TestPollActivityTaskRecordsStarted(t *testing.T) {
	e, m, _ := newEngine(t)
	ctx := context.Background()
	exec, _ := e.StartWorkflow(ctx, StartRequest{WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default"})
	dt, _, _ := m.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Minute)
	_ = e.CompleteDecisionTask(ctx, dt.ID, exec, []decision.Decision{{
		Kind: decision.KindScheduleActivity,
		ScheduleActivity: &decision.ScheduleActivity{
			ActivityType: "DoX", TaskQueue: "default",
		},
	}})

	at, ok, err := e.PollActivityTask(ctx, "default", "w1", time.Minute)
	if err != nil || !ok {
		t.Fatalf("poll activity: ok=%v err=%v", ok, err)
	}
	if at.ActivityType != "DoX" || at.ActivityID == 0 {
		t.Fatalf("bad activity task: %+v", at)
	}
	hist, _ := m.GetHistory(ctx, exec, 0, 0)
	if hist[len(hist)-1].Kind != history.ActivityStartedKind {
		t.Fatalf("started event not recorded: %+v", hist)
	}
}

func TestCompleteActivityClosesScheduledEvent(t *testing.T) {
	e, m, _ := newEngine(t)
	ctx := context.Background()
	exec, _ := e.StartWorkflow(ctx, StartRequest{WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default"})
	dt, _, _ := m.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Minute)
	_ = e.CompleteDecisionTask(ctx, dt.ID, exec, []decision.Decision{{
		Kind:             decision.KindScheduleActivity,
		ScheduleActivity: &decision.ScheduleActivity{ActivityType: "DoX", TaskQueue: "default"},
	}})
	at, _, _ := e.PollActivityTask(ctx, "default", "w1", time.Minute)
	res, _ := types.NewJSONPayload(42)
	if err := e.CompleteActivityTask(ctx, at.TaskID, exec, at.ActivityID, res, nil); err != nil {
		t.Fatal(err)
	}
	hist, _ := m.GetHistory(ctx, exec, 0, 0)
	last := hist[len(hist)-1]
	if last.Kind != history.ActivityCompletedKind {
		t.Fatalf("last event %s", last.Kind)
	}
	if _, ok, _ := m.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Second); !ok {
		t.Fatal("expected decision task after activity")
	}
}
