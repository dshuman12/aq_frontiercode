package engine

import (
	"context"
	"time"

	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

func (e *Engine) TickTimers(ctx context.Context, batch int) (int, error) {
	if batch <= 0 {
		batch = 64
	}
	now := e.clock.Now()
	due, err := e.store.DueTimers(ctx, now, batch)
	if err != nil {
		return 0, err
	}
	fired := 0
	for _, t := range due {
		if err := e.fireTimer(ctx, t); err != nil {
			e.log.Warn(ctx, "fire timer failed", "wf", t.Execution.String(), "timer", t.TimerID, "err", err)
			continue
		}
		fired++
	}
	return fired, nil
}

func (e *Engine) fireTimer(ctx context.Context, t storage.DueTimer) error {
	mu := e.lockFor(t.Execution)
	mu.Lock()
	defer mu.Unlock()
	ns := t.Namespace
	if ns == "" {
		ns = types.DefaultNamespace
	}
	rec, err := e.store.GetWorkflow(ctx, ns, t.Execution)
	if err != nil {

		_ = e.store.DeleteTimer(ctx, t.Execution, t.TimerID)
		return err
	}
	_ = rec
	ev := history.Event{Kind: history.TimerFired, Workflow: t.Execution, Namespace: ns, Time: e.clock.Now()}
	if err := ev.Encode(&history.TimerFiredAttrs{TimerID: t.TimerID}); err != nil {
		return err
	}
	if _, err := e.store.AppendEvents(ctx, t.Execution, []history.Event{ev}); err != nil {
		return err
	}
	if err := e.store.DeleteTimer(ctx, t.Execution, t.TimerID); err != nil {

		_ = err
	}
	_, err = e.store.EnqueueTask(ctx, storage.Task{
		Kind:      storage.TaskDecision,
		Namespace: ns,
		TaskQueue: rec.TaskQueue,
		Execution: t.Execution,
	})
	return err
}

func (e *Engine) TickLoop(ctx context.Context, interval time.Duration) error {
	if interval <= 0 {
		interval = 100 * time.Millisecond
	}
	tk := e.clock.NewTimer(interval)
	defer tk.Stop()
	for {
		if _, err := e.TickTimers(ctx, 0); err != nil {
			e.log.Warn(ctx, "tick timers", "err", err)
		}
		tk.Reset(interval)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-tk.C():
		}
	}
}
