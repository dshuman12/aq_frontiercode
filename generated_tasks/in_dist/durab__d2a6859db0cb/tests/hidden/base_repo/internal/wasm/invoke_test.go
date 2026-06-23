package wasm

import (
	"context"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestInvokeWorkflowEmptyTick(t *testing.T) {
	ctx := context.Background()
	r := NewRuntime(ctx, nil)
	defer r.Close(ctx)

	if err := r.Compile(ctx, "test", testTickModuleEmpty); err != nil {
		t.Fatalf("compile: %v", err)
	}

	state, err := NewWorkflowState(
		types.Info{Execution: types.Execution{WorkflowID: "w", RunID: "r"}},
		types.Payload{},
		[]history.Event{},
		time.Now(),
	)
	if err != nil {
		t.Fatal(err)
	}

	if err := r.InvokeWorkflow(ctx, "test", state, DefaultWorkflow()); err != nil {
		t.Fatalf("invoke: %v", err)
	}
	if len(state.Decisions) != 0 {
		t.Fatalf("expected zero decisions, got %d", len(state.Decisions))
	}
}

func TestInvokeWorkflowUnknownModule(t *testing.T) {
	ctx := context.Background()
	r := NewRuntime(ctx, nil)
	defer r.Close(ctx)
	state, _ := NewWorkflowState(
		types.Info{Execution: types.Execution{WorkflowID: "w", RunID: "r"}},
		types.Payload{}, []history.Event{}, time.Now(),
	)
	err := r.InvokeWorkflow(ctx, "missing", state, DefaultWorkflow())
	if err == nil {
		t.Fatal("expected error for missing module")
	}
}
