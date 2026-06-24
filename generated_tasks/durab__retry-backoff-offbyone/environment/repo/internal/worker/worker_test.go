package worker

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/clock"
	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/internal/engine"
	"github.com/vishaljakhar/durab/internal/log"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/internal/wasm"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestWorkerRunsWorkflowToCompletion(t *testing.T) {
	ctx := context.Background()
	fc := clock.NewFake(time.Date(2025, 7, 15, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	eng := engine.New(store, fc, log.Default)

	runtime := wasm.NewRuntime(ctx, log.Default)
	defer runtime.Close(ctx)

	w := New(eng, runtime, Options{ID: "w-test", Clock: fc, Log: log.Default})

	completePayload, _ := json.Marshal([]decision.Decision{{
		Kind:             decision.KindCompleteWorkflow,
		CompleteWorkflow: &decision.CompleteWorkflow{},
	}})
	if err := w.RegisterWorkflow(ctx, "Echo", wasm.NewTestModule(completePayload)); err != nil {
		t.Fatal(err)
	}

	exec, err := eng.StartWorkflow(ctx, engine.StartRequest{
		WorkflowID:   "wf-echo",
		WorkflowType: "Echo",
		TaskQueue:    "default",
	})
	if err != nil {
		t.Fatal(err)
	}

	did, err := w.RunOne(ctx, "default")
	if err != nil {
		t.Fatal(err)
	}
	if !did {
		t.Fatal("worker did nothing")
	}

	rec, err := store.GetWorkflow(ctx, types.DefaultNamespace, exec)
	if err != nil {
		t.Fatal(err)
	}
	if rec.Status != types.WorkflowCompleted {
		t.Fatalf("status %s", rec.Status)
	}
}

func TestWorkerUnknownWorkflowFails(t *testing.T) {
	ctx := context.Background()
	fc := clock.NewFake(time.Date(2025, 7, 15, 0, 0, 0, 0, time.UTC))
	store := storage.NewMemoryWithClock(fc)
	eng := engine.New(store, fc, log.Default)
	runtime := wasm.NewRuntime(ctx, log.Default)
	defer runtime.Close(ctx)
	w := New(eng, runtime, Options{ID: "w-test", Clock: fc})

	exec, _ := eng.StartWorkflow(ctx, engine.StartRequest{
		WorkflowID:   "wf",
		WorkflowType: "MissingType",
		TaskQueue:    "default",
	})
	did, err := w.RunOne(ctx, "default")
	if err != nil {
		t.Fatal(err)
	}
	if !did {
		t.Fatal("worker should have picked up the task")
	}
	rec, _ := store.GetWorkflow(ctx, types.DefaultNamespace, exec)
	if rec.Status != types.WorkflowFailed {
		t.Fatalf("status %s", rec.Status)
	}
}
