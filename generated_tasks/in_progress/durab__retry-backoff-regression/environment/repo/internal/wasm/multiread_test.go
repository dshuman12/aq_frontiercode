package wasm

import (
	"context"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestReadingWorkflowExercisesHostWrites(t *testing.T) {
	ctx := context.Background()
	r := NewRuntime(ctx, nil)
	defer r.Close(ctx)
	mod := NewReadingWorkflowModule()
	if err := r.Compile(ctx, "reads", mod); err != nil {
		t.Fatalf("compile: %v", err)
	}
	input, _ := types.NewJSONPayload(map[string]any{"hi": 1})
	state, _ := NewWorkflowState(
		types.Info{Execution: types.Execution{WorkflowID: "w", RunID: "r"}, WorkflowType: "Reads"},
		input,
		[]history.Event{{Kind: history.WorkflowStarted}},
		time.Now(),
	)
	if err := r.InvokeWorkflow(ctx, "reads", state, DefaultWorkflow()); err != nil {
		t.Fatalf("invoke: %v", err)
	}
}
