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

func TestMemoryListLimitAndFilters(t *testing.T) {
	m := newMem(t)
	ctx := context.Background()
	for i := 0; i < 5; i++ {
		w := wf(string(rune('a' + i)))
		_ = m.CreateWorkflow(ctx, w)
	}
	out, _ := m.ListWorkflows(ctx, WorkflowFilter{Namespace: types.DefaultNamespace, Limit: 2})
	if len(out) != 2 {
		t.Fatalf("limit ignored: %d", len(out))
	}
}

func TestMemoryNackResetsVisibility(t *testing.T) {
	m := newMem(t)
	ctx := context.Background()
	_ = m.CreateWorkflow(ctx, wf("a"))
	id, _ := m.EnqueueTask(ctx, Task{Kind: TaskDecision, TaskQueue: "default", Execution: wf("a").Execution})
	_, _, _ = m.DequeueTask(ctx, TaskDecision, "default", "w1", time.Hour)
	if err := m.NackTask(ctx, id, 0); err != nil {
		t.Fatal(err)
	}
	if _, ok, _ := m.DequeueTask(ctx, TaskDecision, "default", "w2", time.Minute); !ok {
		t.Fatal("nacked task should be visible to another worker")
	}
}

func TestMemoryCompleteUnknownReturnsNotFound(t *testing.T) {
	m := newMem(t)
	if err := m.CompleteTask(context.Background(), 9999); !errors.Is(err, errs.NotFound) {
		t.Fatalf("err = %v", err)
	}
}

func TestMemoryDeleteTimerNotFound(t *testing.T) {
	m := newMem(t)
	err := m.DeleteTimer(context.Background(),
		types.Execution{WorkflowID: "x", RunID: "y"}, "t1")
	if !errors.Is(err, errs.NotFound) {
		t.Fatalf("err = %v", err)
	}
}

func TestMemoryHistoryEmptyExec(t *testing.T) {
	m := newMem(t)
	hist, err := m.GetHistory(context.Background(),
		types.Execution{WorkflowID: "ghost", RunID: "x"}, 0, 0)
	if err != nil {
		t.Fatal(err)
	}
	if hist != nil {
		t.Fatalf("expected nil, got %+v", hist)
	}
}

func TestSQLitePagination(t *testing.T) {
	dir := t.TempDir()
	s, err := OpenSQLite(filepath.Join(dir, "p.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	ctx := context.Background()
	for i := 0; i < 6; i++ {
		_ = s.CreateWorkflow(ctx, wf(string(rune('a'+i))))
	}
	out, err := s.ListWorkflows(ctx, WorkflowFilter{Namespace: types.DefaultNamespace, Limit: 3})
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 3 {
		t.Fatalf("got %d", len(out))
	}
}

func TestSQLiteHistoryRangeUpper(t *testing.T) {
	dir := t.TempDir()
	s, err := OpenSQLite(filepath.Join(dir, "h.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	ctx := context.Background()
	_ = s.CreateWorkflow(ctx, wf("a"))
	evs := []history.Event{
		{Kind: history.WorkflowStarted},
		{Kind: history.ActivityScheduledKind},
		{Kind: history.ActivityStartedKind},
	}
	_, _ = s.AppendEvents(ctx, wf("a").Execution, evs)
	got, err := s.GetHistory(ctx, wf("a").Execution, 0, 2)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 {
		t.Fatalf("upper bound: %d events", len(got))
	}
}

func TestSQLiteSchedulesFullLifecycle(t *testing.T) {
	dir := t.TempDir()
	s, err := OpenSQLite(filepath.Join(dir, "s.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	ctx := context.Background()
	sc := Schedule{
		ID:           "s1",
		Namespace:    types.DefaultNamespace,
		Spec:         "*/5 * * * *",
		WorkflowID:   "wf",
		WorkflowType: "T",
		TaskQueue:    "default",
		NextRun:      time.Now().Add(-time.Hour),
	}
	if err := s.CreateSchedule(ctx, sc); err != nil {
		t.Fatal(err)
	}
	got, _ := s.GetSchedule(ctx, types.DefaultNamespace, "s1")
	if got.ID != "s1" {
		t.Fatalf("got %+v", got)
	}
	due, _ := s.DueSchedules(ctx, time.Now(), 10)
	if len(due) != 1 {
		t.Fatalf("due len %d", len(due))
	}
	if err := s.PauseSchedule(ctx, types.DefaultNamespace, "s1", true); err != nil {
		t.Fatal(err)
	}
	due, _ = s.DueSchedules(ctx, time.Now(), 10)
	if len(due) != 0 {
		t.Fatalf("paused should hide: %d", len(due))
	}
	if err := s.DeleteSchedule(ctx, types.DefaultNamespace, "s1"); err != nil {
		t.Fatal(err)
	}
}
