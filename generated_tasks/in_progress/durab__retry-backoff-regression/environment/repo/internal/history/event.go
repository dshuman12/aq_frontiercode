package history

import (
	"encoding/json"
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

type EventID int64

type Kind string

const (
	WorkflowStarted            Kind = "WorkflowStarted"
	WorkflowCompletedKind      Kind = "WorkflowCompleted"
	WorkflowFailedKind         Kind = "WorkflowFailed"
	WorkflowCanceledKind       Kind = "WorkflowCanceled"
	WorkflowTimedOutKind       Kind = "WorkflowTimedOut"
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

type Event struct {
	ID        EventID         `json:"id"`
	Kind      Kind            `json:"kind"`
	Time      time.Time       `json:"time"`
	Namespace types.Namespace `json:"namespace"`
	Workflow  types.Execution `json:"workflow"`
	Attempt   int             `json:"attempt,omitempty"`

	Attrs json.RawMessage `json:"attrs,omitempty"`
}

func (e Event) IsTerminal() bool {
	switch e.Kind {
	case WorkflowCompletedKind, WorkflowFailedKind, WorkflowCanceledKind,
		WorkflowTimedOutKind, WorkflowContinuedAsNewKind:
		return true
	}
	return false
}
