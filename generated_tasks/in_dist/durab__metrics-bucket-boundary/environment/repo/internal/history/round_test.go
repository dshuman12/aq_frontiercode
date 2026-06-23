package history

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

func TestAllAttrTypesRoundTrip(t *testing.T) {
	now := time.Date(2026, 5, 9, 0, 0, 0, 0, time.UTC)
	cases := []struct {
		kind  Kind
		attrs any
	}{
		{WorkflowCompletedKind, &WorkflowCompletedAttrs{}},
		{WorkflowFailedKind, &WorkflowFailedAttrs{Failure: &types.Failure{Type: types.FailureApplication, Message: "x"}}},
		{WorkflowContinuedAsNewKind, &WorkflowContinuedAsNewAttrs{NewRunID: "r2"}},
		{ActivityStartedKind, &ActivityStartedAttrs{ActivityID: 7, Attempt: 2}},
		{ActivityCompletedKind, &ActivityCompletedAttrs{ActivityID: 7}},
		{ActivityFailedKind, &ActivityFailedAttrs{ActivityID: 7, Attempt: 3}},
		{TimerStarted, &TimerStartedAttrs{TimerID: "t", Duration: time.Minute}},
		{TimerFired, &TimerFiredAttrs{TimerID: "t"}},
		{TimerCanceled, &TimerCanceledAttrs{TimerID: "t"}},
		{SignalReceived, &SignalReceivedAttrs{Name: "ping"}},
		{ChildWorkflowScheduled, &ChildWorkflowScheduledAttrs{ChildID: "c", WorkflowType: "T"}},
		{ChildWorkflowCompleted, &ChildWorkflowCompletedAttrs{}},
		{MarkerRecorded, &MarkerRecordedAttrs{Name: "m"}},
	}
	for _, c := range cases {
		t.Run(string(c.kind), func(t *testing.T) {
			e := Event{Kind: c.kind, Time: now}
			if err := e.Encode(c.attrs); err != nil {
				t.Fatal(err)
			}
			b, err := json.Marshal(e)
			if err != nil {
				t.Fatal(err)
			}
			var got Event
			if err := json.Unmarshal(b, &got); err != nil {
				t.Fatal(err)
			}
			out, err := got.Decode()
			if err != nil {
				t.Fatal(err)
			}
			if out == nil {
				t.Fatalf("decode returned nil for %s", c.kind)
			}
		})
	}
}

func TestDecodeUnknownKindReturnsNil(t *testing.T) {
	e := Event{Kind: "made_up"}
	out, err := e.Decode()
	if err != nil {
		t.Fatal(err)
	}
	if out != nil {
		t.Fatalf("expected nil for unknown kind, got %T", out)
	}
}

func TestEventEncodeRejectsBadInput(t *testing.T) {
	e := Event{Kind: WorkflowStarted}
	if err := e.Encode(make(chan int)); err == nil {
		t.Fatal("expected error encoding unserialisable value")
	}
}

func TestEventDecodeIntoEmptyAttrs(t *testing.T) {
	e := Event{Kind: WorkflowStarted}
	out := &WorkflowStartedAttrs{}
	if err := e.DecodeInto(out); err != nil {
		t.Fatal(err)
	}
	if out.WorkflowType != "" {
		t.Fatalf("expected zero attrs, got %+v", out)
	}
}
