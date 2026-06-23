package storage

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/pkg/types"
)

var epoch = time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)

func newMem(t *testing.T) *Memory {
	t.Helper()
	return NewMemoryWithClock(clock.NewFake(epoch))
}

func wf(id string) WorkflowRecord {
	return WorkflowRecord{
		Namespace: types.DefaultNamespace,
		Execution: types.Execution{
			WorkflowID: types.WorkflowID(id),
			RunID:      types.RunID("r-" + id),
		},
		WorkflowType: "Test",
		TaskQueue:    "default",
	}
}

func TestCreateAndGet(t *testing.T) {
	m := newMem(t)
	ctx := context.Background()
	if err := m.CreateWorkflow(ctx, wf("a")); err != nil {
		t.Fatal(err)
	}
	got, err := m.GetWorkflow(ctx, types.DefaultNamespace, wf("a").Execution)
	if err != nil {
		t.Fatal(err)
	}
	if got.WorkflowType != "Test" || got.Status != types.WorkflowRunning {
		t.Fatalf("got %+v", got)
	}
}

func TestCreateDuplicate(t *testing.T) {
	m := newMem(t)
	ctx := context.Background()
	_ = m.CreateWorkflow(ctx, wf("a"))
	err := m.CreateWorkflow(ctx, wf("a"))
	if !errors.Is(err, errs.AlreadyExists) {
		t.Fatalf("want AlreadyExists, got %v", err)
	}
}

func TestUpdateStatusTerminal(t *testing.T) {
	m := newMem(t)
	ctx := context.Background()
	_ = m.CreateWorkflow(ctx, wf("a"))
	if err := m.UpdateWorkflowStatus(ctx, types.DefaultNamespace, wf("a").Execution, types.WorkflowCompleted, time.Time{}); err != nil {
		t.Fatal(err)
	}
	r, _ := m.GetWorkflow(ctx, types.DefaultNamespace, wf("a").Execution)
	if r.Status != types.WorkflowCompleted || r.CloseTime.IsZero() {
		t.Fatalf("status not closed: %+v", r)
	}
	// re-transition to another terminal should fail
	err := m.UpdateWorkflowStatus(ctx, types.DefaultNamespace, wf("a").Execution, types.WorkflowFailed, time.Time{})
	if !errors.Is(err, errs.Conflict) {
		t.Fatalf("want Conflict, got %v", err)
	}
}

func TestAppendAndReadHistory(t *testing.T) {
	m := newMem(t)
	ctx := context.Background()
	_ = m.CreateWorkflow(ctx, wf("a"))
	evs := []history.Event{{Kind: history.WorkflowStarted}, {Kind: history.ActivityScheduledKind}}
	out, err := m.AppendEvents(ctx, wf("a").Execution, evs)
	if err != nil {
		t.Fatal(err)
	}
	if out[0].ID != 1 || out[1].ID != 2 {
		t.Fatalf("ids %d,%d", out[0].ID, out[1].ID)
	}
	got, err := m.GetHistory(ctx, wf("a").Execution, 0, 0)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 {
		t.Fatalf("history len %d", len(got))
	}
	last, _ := m.LastEventID(ctx, wf("a").Execution)
	if last != 2 {
		t.Fatalf("last id %d", last)
	}
}

func TestTaskEnqueueDequeueComplete(t *testing.T) {
	m := newMem(t)
	ctx := context.Background()
	id, err := m.EnqueueTask(ctx, Task{
		Kind:      TaskDecision,
		TaskQueue: "default",
		Execution: wf("a").Execution,
	})
	if err != nil {
		t.Fatal(err)
	}
	if id == 0 {
		t.Fatal("zero id")
	}
	got, ok, err := m.DequeueTask(ctx, TaskDecision, "default", "w1", 10*time.Second)
	if err != nil || !ok {
		t.Fatalf("dequeue: ok=%v err=%v", ok, err)
	}
	if got.ID != id {
		t.Fatalf("task id %d != %d", got.ID, id)
	}
	if err := m.CompleteTask(ctx, id); err != nil {
		t.Fatal(err)
	}
	if _, ok, _ := m.DequeueTask(ctx, TaskDecision, "default", "w2", time.Second); ok {
		t.Fatal("task should be gone")
	}
}

func TestDueTimers(t *testing.T) {
	m := newMem(t)
	ctx := context.Background()
	exec := wf("a").Execution
	if err := m.ScheduleTimer(ctx, exec, "t1", epoch.Add(time.Second)); err != nil {
		t.Fatal(err)
	}
	if err := m.ScheduleTimer(ctx, exec, "t2", epoch.Add(2*time.Second)); err != nil {
		t.Fatal(err)
	}
	due, _ := m.DueTimers(ctx, epoch.Add(1500*time.Millisecond), 0)
	if len(due) != 1 || due[0].TimerID != "t1" {
		t.Fatalf("due: %+v", due)
	}
}

func TestScheduleTimerDuplicate(t *testing.T) {
	m := newMem(t)
	ctx := context.Background()
	exec := wf("a").Execution
	_ = m.ScheduleTimer(ctx, exec, "t1", epoch)
	err := m.ScheduleTimer(ctx, exec, "t1", epoch)
	if !errors.Is(err, errs.AlreadyExists) {
		t.Fatalf("want AlreadyExists, got %v", err)
	}
}
