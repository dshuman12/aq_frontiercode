package storage

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestNewMemoryDefaultsToSystemClock(t *testing.T) {
	m := NewMemory()
	if m == nil {
		t.Fatal("NewMemory returned nil")
	}
	if err := m.Close(); err != nil {
		t.Fatal(err)
	}
}

func TestMemoryPendingTasks(t *testing.T) {
	m := newMem(t)
	ctx := context.Background()
	_ = m.CreateWorkflow(ctx, wf("a"))
	_, _ = m.EnqueueTask(ctx, Task{Kind: TaskDecision, TaskQueue: "default", Execution: wf("a").Execution})
	_, _ = m.EnqueueTask(ctx, Task{Kind: TaskActivity, TaskQueue: "default", Execution: wf("a").Execution})
	if n, _ := m.PendingTasks(ctx, "", ""); n != 2 {
		t.Fatalf("all = %d", n)
	}
	if n, _ := m.PendingTasks(ctx, TaskActivity, ""); n != 1 {
		t.Fatalf("activity = %d", n)
	}
	if n, _ := m.PendingTasks(ctx, "", "missing"); n != 0 {
		t.Fatalf("wrong queue = %d", n)
	}
}

func TestSQLitePendingTasks(t *testing.T) {
	dir := t.TempDir()
	s, _ := OpenSQLite(filepath.Join(dir, "p.db"))
	defer s.Close()
	ctx := context.Background()
	_ = s.CreateWorkflow(ctx, wf("a"))
	_, _ = s.EnqueueTask(ctx, Task{Kind: TaskDecision, Namespace: types.DefaultNamespace, TaskQueue: "default", Execution: wf("a").Execution})
	_, _ = s.EnqueueTask(ctx, Task{Kind: TaskDecision, Namespace: types.DefaultNamespace, TaskQueue: "default", Execution: wf("a").Execution})
	if n, _ := s.PendingTasks(ctx, "", ""); n != 2 {
		t.Fatalf("all = %d", n)
	}
}

func TestSQLiteLastEventID(t *testing.T) {
	dir := t.TempDir()
	s, _ := OpenSQLite(filepath.Join(dir, "l.db"))
	defer s.Close()
	ctx := context.Background()
	_ = s.CreateWorkflow(ctx, wf("a"))
	if id, _ := s.LastEventID(ctx, wf("a").Execution); id != 0 {
		t.Fatalf("empty = %d", id)
	}
	_, _ = s.AppendEvents(ctx, wf("a").Execution, []history.Event{
		{Kind: history.WorkflowStarted},
		{Kind: history.ActivityScheduledKind},
	})
	if id, _ := s.LastEventID(ctx, wf("a").Execution); id != 2 {
		t.Fatalf("got %d", id)
	}
}

func TestSQLiteDeleteTimer(t *testing.T) {
	dir := t.TempDir()
	s, _ := OpenSQLite(filepath.Join(dir, "t.db"))
	defer s.Close()
	ctx := context.Background()
	_ = s.CreateWorkflow(ctx, wf("a"))
	if err := s.ScheduleTimer(ctx, wf("a").Execution, "t1", time.Now()); err != nil {
		t.Fatal(err)
	}
	if err := s.DeleteTimer(ctx, wf("a").Execution, "t1"); err != nil {
		t.Fatal(err)
	}
	err := s.DeleteTimer(ctx, wf("a").Execution, "t1")
	if !errors.Is(err, errs.NotFound) {
		t.Fatalf("second delete: %v", err)
	}
}

func TestSQLiteUpdateScheduleRunListSchedules(t *testing.T) {
	dir := t.TempDir()
	s, _ := OpenSQLite(filepath.Join(dir, "s.db"))
	defer s.Close()
	ctx := context.Background()
	sc := Schedule{
		ID: "s1", Namespace: types.DefaultNamespace,
		Spec: "*/5 * * * *", WorkflowID: "wf", WorkflowType: "T", TaskQueue: "default",
	}
	if err := s.CreateSchedule(ctx, sc); err != nil {
		t.Fatal(err)
	}
	if err := s.UpdateScheduleRun(ctx, "", "s1", time.Now(), time.Now().Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	out, err := s.ListSchedules(ctx, types.DefaultNamespace)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 1 {
		t.Fatalf("list = %d", len(out))
	}
	if err := s.UpdateScheduleRun(ctx, "", "missing", time.Now(), time.Now()); !errors.Is(err, errs.NotFound) {
		t.Fatalf("err = %v", err)
	}
}

func TestSQLiteAppendEmptyNoop(t *testing.T) {
	dir := t.TempDir()
	s, _ := OpenSQLite(filepath.Join(dir, "e.db"))
	defer s.Close()
	out, err := s.AppendEvents(context.Background(), types.Execution{WorkflowID: "x", RunID: "y"}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if out != nil {
		t.Fatalf("expected nil, got %+v", out)
	}
}

func TestMemoryNackUnknownReturnsNotFound(t *testing.T) {
	m := newMem(t)
	if err := m.NackTask(context.Background(), 9999, time.Second); !errors.Is(err, errs.NotFound) {
		t.Fatalf("err = %v", err)
	}
}
