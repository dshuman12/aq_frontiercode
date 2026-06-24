package storage

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/pkg/types"
)

func runConformance(t *testing.T, name string, open func(t *testing.T) Store) {
	t.Run(name+"/wf_lifecycle", func(t *testing.T) {
		s := open(t)
		ctx := context.Background()
		w := wf("a")
		if err := s.CreateWorkflow(ctx, w); err != nil {
			t.Fatal(err)
		}
		evs := []history.Event{{Kind: history.WorkflowStarted}}
		out, err := s.AppendEvents(ctx, w.Execution, evs)
		if err != nil {
			t.Fatal(err)
		}
		if out[0].ID != 1 {
			t.Fatalf("first event id = %d", out[0].ID)
		}
		if err := s.UpdateWorkflowStatus(ctx, w.Namespace, w.Execution, types.WorkflowCompleted, time.Time{}); err != nil {
			t.Fatal(err)
		}
		rec, _ := s.GetWorkflow(ctx, w.Namespace, w.Execution)
		if rec.Status != types.WorkflowCompleted {
			t.Fatalf("status = %s", rec.Status)
		}
	})

	t.Run(name+"/task_lease", func(t *testing.T) {
		s := open(t)
		ctx := context.Background()
		w := wf("a")
		_ = s.CreateWorkflow(ctx, w)
		id, _ := s.EnqueueTask(ctx, Task{Kind: TaskDecision, Namespace: w.Namespace, TaskQueue: "default", Execution: w.Execution})
		got, ok, _ := s.DequeueTask(ctx, TaskDecision, "default", "w1", time.Minute)
		if !ok || got.ID != id {
			t.Fatalf("dequeue: ok=%v id=%d", ok, got.ID)
		}
		if _, ok, _ := s.DequeueTask(ctx, TaskDecision, "default", "w2", time.Second); ok {
			t.Fatal("leased task should be hidden")
		}
		_ = s.CompleteTask(ctx, id)
	})
}

func TestStoreConformance(t *testing.T) {
	runConformance(t, "memory", func(t *testing.T) Store {
		return newMem(t)
	})
	runConformance(t, "sqlite", func(t *testing.T) Store {
		dir := t.TempDir()
		s, err := OpenSQLite(filepath.Join(dir, "c.db"))
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = s.Close() })
		return s
	})
}
