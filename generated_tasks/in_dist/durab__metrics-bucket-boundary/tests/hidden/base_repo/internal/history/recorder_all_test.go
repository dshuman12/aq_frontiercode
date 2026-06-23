package history

import (
	"testing"

	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/pkg/types"
)

func TestRecorderCoversAllKinds(t *testing.T) {
	exec := types.Execution{WorkflowID: "wf", RunID: "r"}
	r := NewRecorder(exec, 1)

	out, err := r.Record([]decision.Decision{
		{Kind: decision.KindCompleteWorkflow, CompleteWorkflow: &decision.CompleteWorkflow{}},
		{Kind: decision.KindFailWorkflow, FailWorkflow: &decision.FailWorkflow{Failure: &types.Failure{Type: types.FailureApplication, Message: "x"}}},
		{Kind: decision.KindContinueAsNew, ContinueAsNew: &decision.ContinueAsNew{Reason: "bump"}},
		{Kind: decision.KindStartChild, StartChild: &decision.StartChild{ChildID: "c1", WorkflowType: "T"}},
		{Kind: decision.KindRecordMarker, RecordMarker: &decision.RecordMarker{Name: "side-effect"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	want := []Kind{
		WorkflowCompletedKind,
		WorkflowFailedKind,
		WorkflowContinuedAsNewKind,
		ChildWorkflowScheduled,
		MarkerRecorded,
	}
	if len(out) != len(want) {
		t.Fatalf("len=%d", len(out))
	}
	for i, k := range want {
		if out[i].Kind != k {
			t.Fatalf("event %d kind = %s, want %s", i, out[i].Kind, k)
		}
	}
}

func TestRecorderMissingPayloads(t *testing.T) {
	r := NewRecorder(types.Execution{WorkflowID: "wf", RunID: "r"}, 1)
	kinds := []decision.Kind{
		decision.KindStartTimer,
		decision.KindCancelTimer,
		decision.KindCompleteWorkflow,
		decision.KindFailWorkflow,
		decision.KindContinueAsNew,
		decision.KindStartChild,
		decision.KindRecordMarker,
	}
	for _, k := range kinds {
		if _, err := r.Record([]decision.Decision{{Kind: k}}); err == nil {
			t.Errorf("kind %s: expected error on nil payload", k)
		}
	}
}
