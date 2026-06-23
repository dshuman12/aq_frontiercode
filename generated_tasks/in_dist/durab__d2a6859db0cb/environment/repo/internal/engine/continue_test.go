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

func TestContinueAsNewSpawnsRun(t *testing.T) {
	fc := clock.NewFake(time.Date(2025, 10, 5, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	e := New(store, fc, log.Default)
	ctx := context.Background()

	exec, _ := e.StartWorkflow(ctx, StartRequest{
		WorkflowID:   "wf",
		WorkflowType: "Loop",
		TaskQueue:    "default",
	})
	dt, _, _ := store.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Minute)
	newInput, _ := types.NewJSONPayload("v2")
	err := e.CompleteDecisionTask(ctx, dt.ID, exec, []decision.Decision{{
		Kind: decision.KindContinueAsNew,
		ContinueAsNew: &decision.ContinueAsNew{
			NewInput: newInput,
			Reason:   "iteration",
		},
	}})
	if err != nil {
		t.Fatal(err)
	}

	// Previous run should be marked ContinuedAsNew.
	prevRec, _ := store.GetWorkflow(ctx, types.DefaultNamespace, exec)
	if prevRec.Status != types.WorkflowContinuedAsNew {
		t.Fatalf("prev status = %s", prevRec.Status)
	}

	// A new run with the same workflow id should exist.
	runs, _ := store.ListWorkflows(ctx, storage.WorkflowFilter{Namespace: types.DefaultNamespace})
	var fresh *storage.WorkflowRecord
	for _, r := range runs {
		if r.Execution.RunID != exec.RunID && r.Execution.WorkflowID == exec.WorkflowID {
			rr := r
			fresh = &rr
			break
		}
	}
	if fresh == nil {
		t.Fatal("no continuation run created")
	}
	if fresh.Parent == nil || fresh.Parent.RunID != exec.RunID {
		t.Fatalf("continuation parent: %+v", fresh.Parent)
	}
	if fresh.Attempt != prevRec.Attempt+1 {
		t.Fatalf("attempt: prev=%d new=%d", prevRec.Attempt, fresh.Attempt)
	}
	// A decision task for the continuation should be enqueued.
	if _, ok, _ := store.DequeueTask(ctx, storage.TaskDecision, "default", "w1", time.Second); !ok {
		t.Fatal("expected decision task for continuation")
	}
}
