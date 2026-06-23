package engine

import (
	"context"
	"fmt"

	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/pkg/types"
)

// ReplayDigest is the summary of a replay run: which events were folded
// in, what derived state, and any anomalies. It is meant for ops/debugging,
// not for clients of the engine.
type ReplayDigest struct {
	Execution types.Execution
	EventCount int
	Status    types.WorkflowStatus
	Activities map[types.ActivityID]types.ActivityStatus
	Timers     map[string]bool // timer_id -> fired
	Signals    []string
	LastEvent  *history.Event
}

// Replay folds a workflow's history into a derived state digest. It does
// NOT execute WASM; that is the worker's job. Replay is read-only and
// safe to run against a live workflow.
func (e *Engine) Replay(ctx context.Context, exec types.Execution) (ReplayDigest, error) {
	hist, err := e.store.GetHistory(ctx, exec, 0, 0)
	if err != nil {
		return ReplayDigest{}, err
	}
	if len(hist) == 0 {
		return ReplayDigest{}, fmt.Errorf("no history for %s", exec)
	}
	d := ReplayDigest{
		Execution:  exec,
		EventCount: len(hist),
		Status:     types.WorkflowRunning,
		Activities: make(map[types.ActivityID]types.ActivityStatus),
		Timers:     make(map[string]bool),
	}
	for i := range hist {
		ev := &hist[i]
		switch ev.Kind {
		case history.ActivityScheduledKind:
			a := &history.ActivityScheduledAttrs{}
			_ = ev.DecodeInto(a)
			d.Activities[a.ActivityID] = types.ActivityScheduled
		case history.ActivityStartedKind:
			a := &history.ActivityStartedAttrs{}
			_ = ev.DecodeInto(a)
			d.Activities[a.ActivityID] = types.ActivityStarted
		case history.ActivityCompletedKind:
			a := &history.ActivityCompletedAttrs{}
			_ = ev.DecodeInto(a)
			d.Activities[a.ActivityID] = types.ActivityCompleted
		case history.ActivityFailedKind:
			a := &history.ActivityFailedAttrs{}
			_ = ev.DecodeInto(a)
			d.Activities[a.ActivityID] = types.ActivityFailed
		case history.ActivityTimedOutKind:
			a := &history.ActivityFailedAttrs{}
			_ = ev.DecodeInto(a)
			d.Activities[a.ActivityID] = types.ActivityTimedOut
		case history.TimerStarted:
			a := &history.TimerStartedAttrs{}
			_ = ev.DecodeInto(a)
			d.Timers[a.TimerID] = false
		case history.TimerFired:
			a := &history.TimerFiredAttrs{}
			_ = ev.DecodeInto(a)
			d.Timers[a.TimerID] = true
		case history.SignalReceived:
			a := &history.SignalReceivedAttrs{}
			_ = ev.DecodeInto(a)
			d.Signals = append(d.Signals, a.Name)
		case history.WorkflowCompletedKind:
			d.Status = types.WorkflowCompleted
		case history.WorkflowFailedKind:
			d.Status = types.WorkflowFailed
		case history.WorkflowCanceledKind:
			d.Status = types.WorkflowCanceled
		case history.WorkflowTimedOutKind:
			d.Status = types.WorkflowTimedOut
		case history.WorkflowContinuedAsNewKind:
			d.Status = types.WorkflowContinuedAsNew
		}
		d.LastEvent = ev
	}
	return d, nil
}
