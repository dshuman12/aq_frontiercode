package wasm

import (
	"context"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestNewRuntimeAndClose(t *testing.T) {
	ctx := context.Background()
	r := NewRuntime(ctx, nil)
	if err := r.Close(ctx); err != nil {
		t.Fatal(err)
	}
}

func TestCompileRejectsGarbage(t *testing.T) {
	ctx := context.Background()
	r := NewRuntime(ctx, nil)
	defer r.Close(ctx)
	err := r.Compile(ctx, "bad", []byte{0x00, 0x01, 0x02})
	if err == nil {
		t.Fatal("expected compile error on non-wasm bytes")
	}
}

func TestRegisterWorkflowState(t *testing.T) {
	ctx := context.Background()
	r := NewRuntime(ctx, nil)
	defer r.Close(ctx)
	state, err := NewWorkflowState(
		types.Info{Execution: types.Execution{WorkflowID: "w", RunID: "r"}},
		types.Payload{},
		[]history.Event{},
		time.Now(),
	)
	if err != nil {
		t.Fatal(err)
	}
	closer, err := r.RegisterWorkflow(ctx, state)
	if err != nil {
		t.Fatal(err)
	}
	if err := closer.Close(ctx); err != nil {
		t.Fatal(err)
	}
}

func TestRandomDeterministic(t *testing.T) {
	state1, _ := NewWorkflowState(
		types.Info{Execution: types.Execution{WorkflowID: "w", RunID: "r"}},
		types.Payload{}, []history.Event{}, time.Now(),
	)
	state2, _ := NewWorkflowState(
		types.Info{Execution: types.Execution{WorkflowID: "w", RunID: "r"}},
		types.Payload{}, []history.Event{}, time.Now(),
	)
	for i := 0; i < 16; i++ {
		if state1.random() != state2.random() {
			t.Fatalf("random not deterministic at i=%d", i)
		}
	}
}

func TestRandomDiffersByRun(t *testing.T) {
	a, _ := NewWorkflowState(
		types.Info{Execution: types.Execution{WorkflowID: "w", RunID: "r1"}},
		types.Payload{}, []history.Event{}, time.Now(),
	)
	b, _ := NewWorkflowState(
		types.Info{Execution: types.Execution{WorkflowID: "w", RunID: "r2"}},
		types.Payload{}, []history.Event{}, time.Now(),
	)
	if a.random() == b.random() {
		t.Fatal("different runs should produce different first random()")
	}
}

func TestFormatUUIDShape(t *testing.T) {
	var b [16]byte
	for i := range b {
		b[i] = byte(i)
	}
	got := formatUUID(b)
	if len(got) != 36 {
		t.Fatalf("uuid length = %d", len(got))
	}
	if got[8] != '-' || got[13] != '-' || got[18] != '-' || got[23] != '-' {
		t.Fatalf("uuid format = %q", got)
	}
}
