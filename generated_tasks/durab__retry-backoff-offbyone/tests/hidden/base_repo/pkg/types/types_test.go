package types

import (
	"encoding/json"
	"errors"
	"testing"
)

func TestWorkflowStatusIsTerminal(t *testing.T) {
	cases := map[WorkflowStatus]bool{
		WorkflowRunning:        false,
		WorkflowCompleted:      true,
		WorkflowFailed:         true,
		WorkflowCanceled:       true,
		WorkflowTerminated:     true,
		WorkflowTimedOut:       true,
		WorkflowContinuedAsNew: true,
	}
	for s, want := range cases {
		if got := s.IsTerminal(); got != want {
			t.Errorf("%s: IsTerminal=%v want %v", s, got, want)
		}
	}
}

func TestPayloadJSONRoundTrip(t *testing.T) {
	type in struct {
		Name string `json:"name"`
		N    int    `json:"n"`
	}
	src := in{Name: "alice", N: 7}
	p, err := NewJSONPayload(src)
	if err != nil {
		t.Fatal(err)
	}
	if p.Encoding != "json/plain" {
		t.Fatalf("encoding %q", p.Encoding)
	}
	var got in
	if err := p.Decode(&got); err != nil {
		t.Fatal(err)
	}
	if got != src {
		t.Fatalf("round-trip mismatch: %+v vs %+v", got, src)
	}
}

func TestPayloadEmpty(t *testing.T) {
	var p Payload
	var out struct{}
	if err := p.Decode(&out); !errors.Is(err, ErrEmptyPayload) {
		t.Fatalf("want ErrEmptyPayload, got %v", err)
	}
}

func TestPayloadNilIsEmpty(t *testing.T) {
	p, err := NewJSONPayload(nil)
	if err != nil {
		t.Fatal(err)
	}
	if p.Encoding != "" || len(p.Data) != 0 {
		t.Fatalf("expected zero payload, got %+v", p)
	}
}

func TestFailureUnwrap(t *testing.T) {
	root := &Failure{Type: FailureApplication, Message: "boom"}
	mid := &Failure{Type: FailureApplication, Message: "wrap", Cause: root}
	if !errors.Is(mid, root) {
		t.Fatal("errors.Is should follow Unwrap chain")
	}
}

func TestRetryDefaultNonZero(t *testing.T) {
	if DefaultRetry().IsZero() {
		t.Fatal("DefaultRetry should not be zero")
	}
	var z RetryPolicy
	if !z.IsZero() {
		t.Fatal("zero retry should report IsZero")
	}
}

func TestExecutionStringStable(t *testing.T) {
	e := Execution{WorkflowID: "w", RunID: "r"}
	if e.String() != "w/r" {
		t.Fatalf("got %q", e.String())
	}
	b, _ := json.Marshal(e)
	if string(b) != `{"workflow_id":"w","run_id":"r"}` {
		t.Fatalf("json shape changed: %s", b)
	}
}
