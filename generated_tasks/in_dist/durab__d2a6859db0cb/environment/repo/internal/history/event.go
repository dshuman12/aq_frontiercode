// Package history records what happened in a workflow run. Events are the
// engine's source of truth: a workflow's state is the deterministic result of
// folding its history. Replay = re-fold = same state.
//
// Two invariants the rest of the engine relies on:
//  1. History events are append-only and totally ordered within a run by
//     EventID (1-based, monotonically increasing).
//  2. The ID of an event is assigned by the engine when the event is
//     persisted. SDK-emitted "intents" do not carry IDs.
package history

import (
	"encoding/json"
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

// EventID is the per-run sequence number.
type EventID int64

// Kind discriminates the union of event payloads. New kinds MUST be appended
// at the end of the const block; reordering breaks history compatibility.
type Kind string

const (
	WorkflowStarted          Kind = "WorkflowStarted"
	WorkflowCompletedKind    Kind = "WorkflowCompleted"
	WorkflowFailedKind       Kind = "WorkflowFailed"
	WorkflowCanceledKind     Kind = "WorkflowCanceled"
	WorkflowTimedOutKind     Kind = "WorkflowTimedOut"
	WorkflowContinuedAsNewKind Kind = "WorkflowContinuedAsNew"

	ActivityScheduledKind Kind = "ActivityScheduled"
	ActivityStartedKind   Kind = "ActivityStarted"
	ActivityCompletedKind Kind = "ActivityCompleted"
	ActivityFailedKind    Kind = "ActivityFailed"
	ActivityTimedOutKind  Kind = "ActivityTimedOut"
	ActivityCanceledKind  Kind = "ActivityCanceled"

	TimerStarted  Kind = "TimerStarted"
	TimerFired    Kind = "TimerFired"
	TimerCanceled Kind = "TimerCanceled"

	SignalReceived Kind = "SignalReceived"
	QueryAttached  Kind = "QueryAttached"

	ChildWorkflowScheduled Kind = "ChildWorkflowScheduled"
	ChildWorkflowStarted   Kind = "ChildWorkflowStarted"
	ChildWorkflowCompleted Kind = "ChildWorkflowCompleted"
	ChildWorkflowFailed    Kind = "ChildWorkflowFailed"

	MarkerRecorded Kind = "MarkerRecorded"
)

// Event is the unit of history. Fields are arranged so that the JSON shape
// is stable and tools can parse old events as new schema evolves
// (additive-only).
type Event struct {
	ID        EventID         `json:"id"`
	Kind      Kind            `json:"kind"`
	Time      time.Time       `json:"time"`
	Namespace types.Namespace `json:"namespace"`
	Workflow  types.Execution `json:"workflow"`
	Attempt   int             `json:"attempt,omitempty"`

	// Attrs holds the kind-specific payload. The shape depends on Kind;
	// readers should switch on Kind and unmarshal into the corresponding
	// struct from this package.
	Attrs json.RawMessage `json:"attrs,omitempty"`
}

// IsTerminal reports whether e closes a workflow run.
func (e Event) IsTerminal() bool {
	switch e.Kind {
	case WorkflowCompletedKind, WorkflowFailedKind, WorkflowCanceledKind,
		WorkflowTimedOutKind, WorkflowContinuedAsNewKind:
		return true
	}
	return false
}
