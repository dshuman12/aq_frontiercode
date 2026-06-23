package engine

import (
	"context"
	"time"

	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

// ActivityTimeoutSweep finds activity tasks whose ScheduleToCloseTimeout
// has elapsed (counting from the ActivityScheduled event time), records a
// timeout failure, and enqueues a decision task. Returns count of expired.
func (e *Engine) ActivityTimeoutSweep(ctx context.Context, batch int) (int, error) {
	if batch <= 0 {
		batch = 64
	}
	running, err := e.store.ListWorkflows(ctx, storage.WorkflowFilter{
		Status: types.WorkflowRunning,
		Limit:  batch,
	})
	if err != nil {
		return 0, err
	}
	now := e.clock.Now()
	expired := 0
	for _, r := range running {
		hist, err := e.store.GetHistory(ctx, r.Execution, 0, 0)
		if err != nil {
			continue
		}
		// Walk and find scheduled activities without terminal events,
		// then check their ScheduleToCloseTimeout against scheduled time.
		open := map[types.ActivityID]history.Event{}
		for _, ev := range hist {
			switch ev.Kind {
			case history.ActivityScheduledKind:
				a := &history.ActivityScheduledAttrs{}
				if err := ev.DecodeInto(a); err != nil {
					continue
				}
				open[a.ActivityID] = ev
			case history.ActivityCompletedKind, history.ActivityFailedKind,
				history.ActivityCanceledKind, history.ActivityTimedOutKind:
				a := &history.ActivityCompletedAttrs{}
				_ = ev.DecodeInto(a)
				delete(open, a.ActivityID)
			}
		}
		for aid, scheduled := range open {
			attrs := &history.ActivityScheduledAttrs{}
			if err := scheduled.DecodeInto(attrs); err != nil {
				continue
			}
			timeout := attrs.Options.ScheduleToCloseTimeout
			if timeout <= 0 {
				continue
			}
			if now.Sub(scheduled.Time) < timeout {
				continue
			}
			if err := e.recordActivityTimeout(ctx, r, aid); err != nil {
				e.log.Warn(ctx, "activity timeout", "exec", r.Execution.String(), "aid", aid, "err", err)
				continue
			}
			expired++
		}
	}
	return expired, nil
}

func (e *Engine) recordActivityTimeout(ctx context.Context, r storage.WorkflowRecord, aid types.ActivityID) error {
	mu := e.lockFor(r.Execution)
	mu.Lock()
	defer mu.Unlock()
	now := e.clock.Now()
	ev := history.Event{Kind: history.ActivityTimedOutKind, Workflow: r.Execution, Namespace: r.Namespace, Time: now}
	if err := ev.Encode(&history.ActivityFailedAttrs{
		ActivityID: aid,
		Failure:    &types.Failure{Type: types.FailureTimeout, Message: "activity timed out"},
	}); err != nil {
		return err
	}
	if _, err := e.store.AppendEvents(ctx, r.Execution, []history.Event{ev}); err != nil {
		return err
	}
	_, err := e.store.EnqueueTask(ctx, storage.Task{
		Kind:      storage.TaskDecision,
		Namespace: r.Namespace,
		TaskQueue: r.TaskQueue,
		Execution: r.Execution,
	})
	return err
}

// ActivityTimeoutLoop runs the sweep on a fixed cadence.
func (e *Engine) ActivityTimeoutLoop(ctx context.Context, interval time.Duration) error {
	if interval <= 0 {
		interval = 5 * time.Second
	}
	t := e.clock.NewTimer(interval)
	defer t.Stop()
	for {
		if _, err := e.ActivityTimeoutSweep(ctx, 0); err != nil {
			e.log.Warn(ctx, "activity timeout loop", "err", err)
		}
		t.Reset(interval)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C():
		}
	}
}
