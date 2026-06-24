package wasm

import (
	"context"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

func TestActivityWriteResult(t *testing.T) {
	ctx := context.Background()
	r := NewRuntime(ctx, nil)
	defer r.Close(ctx)
	mod := NewTestActivityModule([]byte(`{"ok":true}`))
	if err := r.Compile(ctx, "act", mod); err != nil {
		t.Fatal(err)
	}
	state := &ActivityState{
		Info: ActivityInfo{
			Execution:  types.Execution{WorkflowID: "w", RunID: "r"},
			ActivityID: 1,
			TaskQueue:  "default",
		},
	}
	if err := r.InvokeActivity(ctx, "act", state, DefaultActivity()); err != nil {
		t.Fatal(err)
	}
	if state.Failure != nil {
		t.Fatalf("unexpected failure: %v", state.Failure)
	}
	if string(state.Result.Data) != `{"ok":true}` {
		t.Fatalf("result = %q", state.Result.Data)
	}
}

func TestActivityUnknownModule(t *testing.T) {
	ctx := context.Background()
	r := NewRuntime(ctx, nil)
	defer r.Close(ctx)
	state := &ActivityState{Info: ActivityInfo{Execution: types.Execution{WorkflowID: "w", RunID: "r"}}}
	if err := r.InvokeActivity(ctx, "missing", state, DefaultActivity()); err == nil {
		t.Fatal("expected error")
	}
}

func TestRuntimeCloseTwiceSafe(t *testing.T) {
	ctx := context.Background()
	r := NewRuntime(ctx, nil)
	if err := r.Close(ctx); err != nil {
		t.Fatal(err)
	}
}

func TestCompiledLookupMiss(t *testing.T) {
	ctx := context.Background()
	r := NewRuntime(ctx, nil)
	defer r.Close(ctx)
	if _, ok := r.Compiled("nope"); ok {
		t.Fatal("expected miss")
	}
}

func TestDefaultsNonZero(t *testing.T) {
	w := DefaultWorkflow()
	if w.MaxMemoryPages == 0 || w.MaxFuelTicks == 0 || w.MaxWallTime == 0 {
		t.Fatalf("workflow defaults zero: %+v", w)
	}
	a := DefaultActivity()
	if a.MaxMemoryPages <= w.MaxMemoryPages {
		t.Fatalf("activity should allow more memory than workflow: %d vs %d", a.MaxMemoryPages, w.MaxMemoryPages)
	}
	if a.MaxWallTime <= 0 {
		t.Fatal("activity wall time should be positive")
	}
}

func TestNewWorkflowStateMarshalsHistory(t *testing.T) {
	now := time.Date(2026, 5, 8, 0, 0, 0, 0, time.UTC)
	s, err := NewWorkflowState(
		types.Info{Execution: types.Execution{WorkflowID: "w", RunID: "r"}},
		types.Payload{Encoding: "json/plain", Data: []byte(`"hi"`)},
		nil, now,
	)
	if err != nil {
		t.Fatal(err)
	}
	if string(s.HistoryRaw) != "null" {
		t.Fatalf("history marshal: %q", s.HistoryRaw)
	}
	if s.Seed == 0 {
		t.Fatal("seed must be non-zero")
	}
}
