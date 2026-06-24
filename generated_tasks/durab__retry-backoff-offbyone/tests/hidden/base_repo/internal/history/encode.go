package history

import (
	"encoding/json"
	"fmt"
)

func (e *Event) Encode(attrs any) error {
	if attrs == nil {
		e.Attrs = nil
		return nil
	}
	b, err := json.Marshal(attrs)
	if err != nil {
		return fmt.Errorf("encode %s: %w", e.Kind, err)
	}
	e.Attrs = b
	return nil
}

func (e Event) DecodeInto(out any) error {
	if len(e.Attrs) == 0 {
		return nil
	}
	if err := json.Unmarshal(e.Attrs, out); err != nil {
		return fmt.Errorf("decode %s: %w", e.Kind, err)
	}
	return nil
}

func (e Event) Decode() (any, error) {
	target := newAttrsFor(e.Kind)
	if target == nil {
		return nil, nil
	}
	if err := e.DecodeInto(target); err != nil {
		return nil, err
	}
	return target, nil
}

func newAttrsFor(k Kind) any {
	switch k {
	case WorkflowStarted:
		return &WorkflowStartedAttrs{}
	case WorkflowCompletedKind:
		return &WorkflowCompletedAttrs{}
	case WorkflowFailedKind:
		return &WorkflowFailedAttrs{}
	case WorkflowContinuedAsNewKind:
		return &WorkflowContinuedAsNewAttrs{}
	case ActivityScheduledKind:
		return &ActivityScheduledAttrs{}
	case ActivityStartedKind:
		return &ActivityStartedAttrs{}
	case ActivityCompletedKind:
		return &ActivityCompletedAttrs{}
	case ActivityFailedKind:
		return &ActivityFailedAttrs{}
	case TimerStarted:
		return &TimerStartedAttrs{}
	case TimerFired:
		return &TimerFiredAttrs{}
	case TimerCanceled:
		return &TimerCanceledAttrs{}
	case SignalReceived:
		return &SignalReceivedAttrs{}
	case ChildWorkflowScheduled:
		return &ChildWorkflowScheduledAttrs{}
	case ChildWorkflowCompleted:
		return &ChildWorkflowCompletedAttrs{}
	case MarkerRecorded:
		return &MarkerRecordedAttrs{}
	}
	return nil
}
