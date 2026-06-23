package wasm

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestBuildEmitDecisionsModuleCompletes(t *testing.T) {
	payload, err := json.Marshal([]decision.Decision{{
		Kind:             decision.KindCompleteWorkflow,
		CompleteWorkflow: &decision.CompleteWorkflow{},
	}})
	if err != nil {
		t.Fatal(err)
	}
	mod := NewTestModule(payload)

	ctx := context.Background()
	r := NewRuntime(ctx, nil)
	defer r.Close(ctx)
	if err := r.Compile(ctx, "echo", mod); err != nil {
		t.Fatalf("compile: %v", err)
	}
	state, err := NewWorkflowState(
		types.Info{Execution: types.Execution{WorkflowID: "w", RunID: "r"}},
		types.Payload{}, []history.Event{}, time.Now(),
	)
	if err != nil {
		t.Fatal(err)
	}
	if err := r.InvokeWorkflow(ctx, "echo", state, DefaultWorkflow()); err != nil {
		t.Fatalf("invoke: %v", err)
	}
	if len(state.Decisions) != 1 {
		t.Fatalf("decisions: %d", len(state.Decisions))
	}
	if state.Decisions[0].Kind != decision.KindCompleteWorkflow {
		t.Fatalf("kind = %s", state.Decisions[0].Kind)
	}
}

func TestBuildEmitTimerThenComplete(t *testing.T) {
	payload, _ := json.Marshal([]decision.Decision{
		{Kind: decision.KindStartTimer, StartTimer: &decision.StartTimer{TimerID: "t1", Duration: time.Second}},
		{Kind: decision.KindCompleteWorkflow, CompleteWorkflow: &decision.CompleteWorkflow{}},
	})
	mod := NewTestModule(payload)
	ctx := context.Background()
	r := NewRuntime(ctx, nil)
	defer r.Close(ctx)
	if err := r.Compile(ctx, "two", mod); err != nil {
		t.Fatal(err)
	}
	state, _ := NewWorkflowState(
		types.Info{Execution: types.Execution{WorkflowID: "w", RunID: "r"}},
		types.Payload{}, []history.Event{}, time.Now(),
	)
	if err := r.InvokeWorkflow(ctx, "two", state, DefaultWorkflow()); err != nil {
		t.Fatal(err)
	}
	if len(state.Decisions) != 2 {
		t.Fatalf("decisions: %d", len(state.Decisions))
	}
}
