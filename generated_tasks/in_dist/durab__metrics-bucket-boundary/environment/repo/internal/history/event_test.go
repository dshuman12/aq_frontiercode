package history

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

func TestEventEncodeDecodeRoundTrip(t *testing.T) {
	e := Event{
		ID:   1,
		Kind: WorkflowStarted,
		Time: time.Date(2025, 5, 1, 12, 0, 0, 0, time.UTC),
		Workflow: types.Execution{
			WorkflowID: "wf-1",
			RunID:      "run-1",
		},
	}
	in := &WorkflowStartedAttrs{
		WorkflowType: "Greet",
		TaskQueue:    "default",
		Retry:        types.DefaultRetry(),
	}
	if err := e.Encode(in); err != nil {
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
	if got.Kind != WorkflowStarted || got.ID != 1 {
		t.Fatalf("envelope changed: %+v", got)
	}

	dec, err := got.Decode()
	if err != nil {
		t.Fatal(err)
	}
	attrs, ok := dec.(*WorkflowStartedAttrs)
	if !ok {
		t.Fatalf("decoded into %T", dec)
	}
	if attrs.WorkflowType != "Greet" {
		t.Fatalf("workflow type = %q", attrs.WorkflowType)
	}
}

func TestEventIsTerminal(t *testing.T) {
	for _, k := range []Kind{
		WorkflowCompletedKind, WorkflowFailedKind, WorkflowCanceledKind,
		WorkflowTimedOutKind, WorkflowContinuedAsNewKind,
	} {
		if !(Event{Kind: k}).IsTerminal() {
			t.Errorf("%s should be terminal", k)
		}
	}
	for _, k := range []Kind{
		WorkflowStarted, ActivityScheduledKind, TimerStarted,
	} {
		if (Event{Kind: k}).IsTerminal() {
			t.Errorf("%s should not be terminal", k)
		}
	}
}

func TestEncodeNilClears(t *testing.T) {
	e := Event{Kind: MarkerRecorded, Attrs: []byte(`{"x":1}`)}
	if err := e.Encode(nil); err != nil {
		t.Fatal(err)
	}
	if e.Attrs != nil {
		t.Fatalf("attrs not cleared: %s", e.Attrs)
	}
}
