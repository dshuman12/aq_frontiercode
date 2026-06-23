package engine

import (
	"context"
	"time"

	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

// TickTimers fires every timer that is due as of e.clock.Now(). For each
// fired timer it appends a TimerFired event and enqueues a decision task.
// Returns the number of timers fired.
//
// Workers do not call this; the server runs it in a background goroutine
// in TickLoop. It is exposed so tests can step through deterministically.
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
		// Best effort: drop the timer.
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
		// Already gone; not fatal.
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

// TickLoop runs TickTimers in a loop. It returns when ctx is canceled.
// Interval controls how often the loop runs; for production 100ms is
// reasonable, tests use a shorter interval.
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
