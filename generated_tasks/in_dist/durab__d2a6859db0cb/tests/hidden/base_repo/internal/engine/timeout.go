package engine

import (
	"context"
	"time"

	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

// TimeoutSweep iterates running workflows and times out any whose
// RunTimeout has elapsed. Returns the number of runs closed.
func (e *Engine) TimeoutSweep(ctx context.Context, batch int) (int, error) {
	if batch <= 0 {
		batch = 64
	}
	now := e.clock.Now()
	running, err := e.store.ListWorkflows(ctx, storage.WorkflowFilter{
		Status: types.WorkflowRunning,
		Limit:  batch,
	})
	if err != nil {
		return 0, err
	}
	timedOut := 0
	for _, r := range running {
		timeout := e.runTimeoutOf(ctx, r.Execution)
		if timeout <= 0 {
			continue
		}
		if !r.StartTime.IsZero() && now.Sub(r.StartTime) < timeout {
			continue
		}
		if err := e.expireRun(ctx, r, now); err != nil {
			e.log.Warn(ctx, "timeout sweep", "exec", r.Execution.String(), "err", err)
			continue
		}
		timedOut++
	}
	return timedOut, nil
}

// runTimeoutOf looks up the run-level timeout from the WorkflowStarted
// event. Zero means "no timeout".
func (e *Engine) runTimeoutOf(ctx context.Context, exec types.Execution) time.Duration {
	hist, err := e.store.GetHistory(ctx, exec, 1, 1)
	if err != nil || len(hist) == 0 {
		return 0
	}
	attrs := &history.WorkflowStartedAttrs{}
	if err := hist[0].DecodeInto(attrs); err != nil {
		return 0
	}
	return attrs.RunTimeout
}

func (e *Engine) expireRun(ctx context.Context, r storage.WorkflowRecord, now time.Time) error {
	mu := e.lockFor(r.Execution)
	mu.Lock()
	defer mu.Unlock()

	ev := history.Event{
		Kind:      history.WorkflowTimedOutKind,
		Workflow:  r.Execution,
		Namespace: r.Namespace,
		Time:      now,
	}
	if err := ev.Encode(&history.WorkflowFailedAttrs{Failure: &types.Failure{
		Type: types.FailureTimeout, Message: "run timeout exceeded",
	}}); err != nil {
		return err
	}
	if _, err := e.store.AppendEvents(ctx, r.Execution, []history.Event{ev}); err != nil {
		return err
	}
	return e.store.UpdateWorkflowStatus(ctx, r.Namespace, r.Execution, types.WorkflowTimedOut, now)
}

// TimeoutLoop runs TimeoutSweep on a fixed cadence. Cancelling ctx exits.
func (e *Engine) TimeoutLoop(ctx context.Context, interval time.Duration) error {
	if interval <= 0 {
		interval = 5 * time.Second
	}
	t := e.clock.NewTimer(interval)
	defer t.Stop()
	for {
		if _, err := e.TimeoutSweep(ctx, 0); err != nil {
			e.log.Warn(ctx, "timeout loop", "err", err)
		}
		t.Reset(interval)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C():
		}
	}
}
