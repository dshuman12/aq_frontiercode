package storage

import (
	"context"
	"errors"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/pkg/types"
)

func openSQLite(t *testing.T) *SQLite {
	t.Helper()
	dir := t.TempDir()
	s, err := OpenSQLite(filepath.Join(dir, "durab.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	s.WithClock(clock.NewFake(epoch))
	return s
}

func TestSQLiteCreateAndGet(t *testing.T) {
	s := openSQLite(t)
	ctx := context.Background()
	if err := s.CreateWorkflow(ctx, wf("a")); err != nil {
		t.Fatal(err)
	}
	got, err := s.GetWorkflow(ctx, types.DefaultNamespace, wf("a").Execution)
	if err != nil {
		t.Fatal(err)
	}
	if got.WorkflowType != "Test" || got.Status != types.WorkflowRunning {
		t.Fatalf("got %+v", got)
	}
}

func TestSQLiteCreateDuplicate(t *testing.T) {
	s := openSQLite(t)
	ctx := context.Background()
	_ = s.CreateWorkflow(ctx, wf("a"))
	err := s.CreateWorkflow(ctx, wf("a"))
	if !errors.Is(err, errs.AlreadyExists) {
		t.Fatalf("want AlreadyExists, got %v", err)
	}
}

func TestSQLiteUpdateStatusTerminal(t *testing.T) {
	s := openSQLite(t)
	ctx := context.Background()
	_ = s.CreateWorkflow(ctx, wf("a"))
	if err := s.UpdateWorkflowStatus(ctx, types.DefaultNamespace, wf("a").Execution, types.WorkflowCompleted, time.Time{}); err != nil {
		t.Fatal(err)
	}
	err := s.UpdateWorkflowStatus(ctx, types.DefaultNamespace, wf("a").Execution, types.WorkflowFailed, time.Time{})
	if !errors.Is(err, errs.Conflict) {
		t.Fatalf("want Conflict, got %v", err)
	}
}

func TestSQLiteAppendHistory(t *testing.T) {
	s := openSQLite(t)
	ctx := context.Background()
	_ = s.CreateWorkflow(ctx, wf("a"))
	evs := []history.Event{{Kind: history.WorkflowStarted}, {Kind: history.ActivityScheduledKind}}
	out, err := s.AppendEvents(ctx, wf("a").Execution, evs)
	if err != nil {
		t.Fatal(err)
	}
	if out[0].ID != 1 || out[1].ID != 2 {
		t.Fatalf("ids %d,%d", out[0].ID, out[1].ID)
	}
	got, err := s.GetHistory(ctx, wf("a").Execution, 0, 0)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got[0].Kind != history.WorkflowStarted {
		t.Fatalf("history %+v", got)
	}
}

func TestSQLiteHistoryRange(t *testing.T) {
	s := openSQLite(t)
	ctx := context.Background()
	_ = s.CreateWorkflow(ctx, wf("a"))
	evs := []history.Event{
		{Kind: history.WorkflowStarted},
		{Kind: history.ActivityScheduledKind},
		{Kind: history.ActivityStartedKind},
		{Kind: history.ActivityCompletedKind},
		{Kind: history.WorkflowCompletedKind},
	}
	_, _ = s.AppendEvents(ctx, wf("a").Execution, evs)
	got, err := s.GetHistory(ctx, wf("a").Execution, 2, 4)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 3 || got[0].ID != 2 || got[2].ID != 4 {
		t.Fatalf("range mismatch: %+v", got)
	}
}

func TestSQLiteTaskLifecycle(t *testing.T) {
	s := openSQLite(t)
	ctx := context.Background()
	_ = s.CreateWorkflow(ctx, wf("a"))
	id, err := s.EnqueueTask(ctx, Task{
		Kind:      TaskDecision,
		Namespace: types.DefaultNamespace,
		TaskQueue: "default",
		Execution: wf("a").Execution,
	})
	if err != nil || id == 0 {
		t.Fatalf("enqueue: id=%d err=%v", id, err)
	}
	got, ok, err := s.DequeueTask(ctx, TaskDecision, "default", "w1", 10*time.Second)
	if err != nil || !ok {
		t.Fatalf("dequeue: ok=%v err=%v", ok, err)
	}
	if got.ID != id || got.Attempts != 1 {
		t.Fatalf("dequeue got %+v", got)
	}
	if _, ok, _ := s.DequeueTask(ctx, TaskDecision, "default", "w2", time.Second); ok {
		t.Fatal("task should be leased")
	}
	if err := s.CompleteTask(ctx, id); err != nil {
		t.Fatal(err)
	}
}

func TestSQLiteNackResetsLease(t *testing.T) {
	s := openSQLite(t)
	ctx := context.Background()
	_ = s.CreateWorkflow(ctx, wf("a"))
	id, _ := s.EnqueueTask(ctx, Task{
		Kind:      TaskActivity,
		Namespace: types.DefaultNamespace,
		TaskQueue: "default",
		Execution: wf("a").Execution,
	})
	got, ok, _ := s.DequeueTask(ctx, TaskActivity, "default", "w1", time.Hour)
	if !ok {
		t.Fatal("expected task")
	}
	if err := s.NackTask(ctx, got.ID, 0); err != nil {
		t.Fatal(err)
	}
	if _, ok, _ := s.DequeueTask(ctx, TaskActivity, "default", "w2", time.Second); !ok {
		t.Fatal("nacked task should be visible to other workers")
	}
	_ = id
}

func TestSQLiteTimerSchedule(t *testing.T) {
	s := openSQLite(t)
	ctx := context.Background()
	_ = s.CreateWorkflow(ctx, wf("a"))
	exec := wf("a").Execution
	if err := s.ScheduleTimer(ctx, exec, "t1", epoch.Add(time.Second)); err != nil {
		t.Fatal(err)
	}
	if err := s.ScheduleTimer(ctx, exec, "t1", epoch.Add(time.Second)); !errors.Is(err, errs.AlreadyExists) {
		t.Fatalf("want AlreadyExists, got %v", err)
	}
	due, err := s.DueTimers(ctx, epoch.Add(2*time.Second), 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(due) != 1 || due[0].TimerID != "t1" {
		t.Fatalf("due: %+v", due)
	}
}

func TestSQLiteConcurrentDequeueSingleWinner(t *testing.T) {
	s := openSQLite(t)
	ctx := context.Background()
	_ = s.CreateWorkflow(ctx, wf("a"))
	if _, err := s.EnqueueTask(ctx, Task{
		Kind:      TaskDecision,
		Namespace: types.DefaultNamespace,
		TaskQueue: "default",
		Execution: wf("a").Execution,
	}); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	var winners int
	var mu sync.Mutex
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, ok, _ := s.DequeueTask(ctx, TaskDecision, "default", "w", time.Minute); ok {
				mu.Lock()
				winners++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if winners != 1 {
		t.Fatalf("want exactly 1 winner, got %d", winners)
	}
}
