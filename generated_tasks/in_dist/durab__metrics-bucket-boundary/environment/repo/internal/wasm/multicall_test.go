package wasm

import (
	"context"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestMultiCallWorkflowExercisesHostFns(t *testing.T) {
	ctx := context.Background()
	r := NewRuntime(ctx, nil)
	defer r.Close(ctx)
	mod := NewMultiCallWorkflowModule()
	if err := r.Compile(ctx, "multi", mod); err != nil {
		t.Fatalf("compile: %v", err)
	}
	state, _ := NewWorkflowState(
		types.Info{Execution: types.Execution{WorkflowID: "w", RunID: "r"}},
		types.Payload{}, []history.Event{}, time.Now(),
	)
	if err := r.InvokeWorkflow(ctx, "multi", state, DefaultWorkflow()); err != nil {
		t.Fatalf("invoke: %v", err)
	}
	if len(state.Decisions) != 0 {
		t.Fatalf("decisions: %d", len(state.Decisions))
	}
}
