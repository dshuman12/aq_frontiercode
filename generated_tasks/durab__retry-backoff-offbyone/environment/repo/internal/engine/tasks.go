package engine

import (
	"context"
	"fmt"
	"time"

	"github.com/vishaljakhar/durab/internal/decision"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

type DecisionTask struct {
	TaskID       int64
	Namespace    types.Namespace
	Execution    types.Execution
	TaskQueue    types.TaskQueue
	WorkflowType string
	History      []history.Event
	Attempt      int
}

type ActivityTask struct {
	TaskID       int64
	Namespace    types.Namespace
	Execution    types.Execution
	ActivityID   types.ActivityID
	ActivityType string
	TaskQueue    types.TaskQueue
	Input        types.Payload
	Attempt      int
	Options      types.ActivityOptions
}

func (e *Engine) PollDecisionTask(ctx context.Context, queue types.TaskQueue, workerID string, lease time.Duration) (DecisionTask, bool, error) {
	t, ok, err := e.store.DequeueTask(ctx, storage.TaskDecision, queue, workerID, lease)
	if err != nil || !ok {
		return DecisionTask{}, ok, err
	}
	rec, err := e.store.GetWorkflow(ctx, t.Namespace, t.Execution)
	if err != nil {

		_ = e.store.CompleteTask(ctx, t.ID)
		return DecisionTask{}, false, err
	}
	hist, err := e.store.GetHistory(ctx, t.Execution, 0, 0)
	if err != nil {
		return DecisionTask{}, false, err
	}
	return DecisionTask{
		TaskID:       t.ID,
		Namespace:    t.Namespace,
		Execution:    t.Execution,
		TaskQueue:    t.TaskQueue,
		WorkflowType: rec.WorkflowType,
		History:      hist,
		Attempt:      t.Attempts,
	}, true, nil
}

func (e *Engine) PollActivityTask(ctx context.Context, queue types.TaskQueue, workerID string, lease time.Duration) (ActivityTask, bool, error) {
	t, ok, err := e.store.DequeueTask(ctx, storage.TaskActivity, queue, workerID, lease)
	if err != nil || !ok {
		return ActivityTask{}, ok, err
	}

	hist, err := e.store.GetHistory(ctx, t.Execution, t.EventID, t.EventID)
	if err != nil || len(hist) == 0 {
		return ActivityTask{}, false, fmt.Errorf("%w: scheduled event missing for task %d", errs.NotFound, t.ID)
	}
	dec, err := hist[0].Decode()
	if err != nil {
		return ActivityTask{}, false, fmt.Errorf("decode scheduled event: %w", err)
	}
	attrs, ok := dec.(*history.ActivityScheduledAttrs)
	if !ok {
		return ActivityTask{}, false, fmt.Errorf("event %d is not ActivityScheduled", t.EventID)
	}

	startedEv := history.Event{
		Kind:      history.ActivityStartedKind,
		Workflow:  t.Execution,
		Namespace: t.Namespace,
		Time:      e.clock.Now(),
	}
	if err := startedEv.Encode(&history.ActivityStartedAttrs{
		ActivityID: attrs.ActivityID,
		Attempt:    t.Attempts,
		WorkerID:   workerID,
	}); err != nil {
		return ActivityTask{}, false, err
	}
	if _, err := e.store.AppendEvents(ctx, t.Execution, []history.Event{startedEv}); err != nil {
		return ActivityTask{}, false, err
	}
	return ActivityTask{
		TaskID:       t.ID,
		Namespace:    t.Namespace,
		Execution:    t.Execution,
		ActivityID:   attrs.ActivityID,
		ActivityType: attrs.ActivityType,
		TaskQueue:    attrs.TaskQueue,
		Input:        attrs.Input,
		Attempt:      t.Attempts,
		Options:      attrs.Options,
	}, true, nil
}

func (e *Engine) CompleteDecisionTask(ctx context.Context, taskID int64, exec types.Execution, decisions []decision.Decision) error {
	mu := e.lockFor(exec)
	mu.Lock()
	defer mu.Unlock()

	ns := types.DefaultNamespace
	if rec, err := e.store.GetWorkflow(ctx, ns, exec); err == nil {
		ns = rec.Namespace
	}
	lastID, _ := e.store.LastEventID(ctx, exec)
	nextActID := nextActivityID(ctx, e.store, exec)
	rec := history.NewRecorder(exec, nextActID)
	events, err := rec.Record(decisions)
	if err != nil {
		return err
	}
	now := e.clock.Now()
	for i := range events {
		events[i].Time = now
		events[i].Namespace = ns
	}
	persisted, err := e.store.AppendEvents(ctx, exec, events)
	if err != nil {
		return err
	}

	for _, ev := range persisted {
		if err := e.materialise(ctx, ns, exec, ev); err != nil {
			return err
		}
		switch ev.Kind {
		case history.WorkflowCompletedKind:
			e.met.inc(e.met.wfCompleted)
		case history.WorkflowFailedKind, history.WorkflowTimedOutKind:
			e.met.inc(e.met.wfFailed)
		}
	}
	if err := e.store.CompleteTask(ctx, taskID); err != nil {
		return err
	}
	_ = lastID
	return nil
}

func (e *Engine) materialise(ctx context.Context, ns types.Namespace, exec types.Execution, ev history.Event) error {
	switch ev.Kind {
	case history.ActivityScheduledKind:
		attrs := &history.ActivityScheduledAttrs{}
		if err := ev.DecodeInto(attrs); err != nil {
			return err
		}
		queue := attrs.TaskQueue
		if queue == "" {
			rec, _ := e.store.GetWorkflow(ctx, ns, exec)
			queue = rec.TaskQueue
		}
		_, err := e.store.EnqueueTask(ctx, storage.Task{
			Kind:       storage.TaskActivity,
			Namespace:  ns,
			TaskQueue:  queue,
			Execution:  exec,
			ActivityID: attrs.ActivityID,
			EventID:    ev.ID,
		})
		return err

	case history.TimerStarted:
		attrs := &history.TimerStartedAttrs{}
		if err := ev.DecodeInto(attrs); err != nil {
			return err
		}
		return e.store.ScheduleTimer(ctx, exec, attrs.TimerID, e.clock.Now().Add(attrs.Duration))

	case history.TimerCanceled:
		attrs := &history.TimerCanceledAttrs{}
		if err := ev.DecodeInto(attrs); err != nil {
			return err
		}

		_ = e.store.DeleteTimer(ctx, exec, attrs.TimerID)
		return nil

	case history.WorkflowCompletedKind, history.WorkflowFailedKind,
		history.WorkflowCanceledKind, history.WorkflowTimedOutKind,
		history.WorkflowContinuedAsNewKind:
		status := types.WorkflowCompleted
		switch ev.Kind {
		case history.WorkflowFailedKind:
			status = types.WorkflowFailed
		case history.WorkflowCanceledKind:
			status = types.WorkflowCanceled
		case history.WorkflowTimedOutKind:
			status = types.WorkflowTimedOut
		case history.WorkflowContinuedAsNewKind:
			status = types.WorkflowContinuedAsNew
		}
		if err := e.store.UpdateWorkflowStatus(ctx, ns, exec, status, e.clock.Now()); err != nil {
			return err
		}
		if ev.Kind == history.WorkflowContinuedAsNewKind {
			return e.startContinuation(ctx, ns, exec, ev)
		}
		return nil
	}
	return nil
}

func (e *Engine) startContinuation(ctx context.Context, ns types.Namespace, prev types.Execution, ev history.Event) error {
	attrs := &history.WorkflowContinuedAsNewAttrs{}
	if err := ev.DecodeInto(attrs); err != nil {
		return err
	}
	prevRec, err := e.store.GetWorkflow(ctx, ns, prev)
	if err != nil {
		return err
	}
	new := types.Execution{
		WorkflowID: prev.WorkflowID,
		RunID:      attrs.NewRunID,
	}

	if new.RunID == "" {
		new.RunID = types.RunID(prev.RunID + "-cont")
	}
	rec := storage.WorkflowRecord{
		Namespace:    ns,
		Execution:    new,
		WorkflowType: prevRec.WorkflowType,
		TaskQueue:    prevRec.TaskQueue,
		Status:       types.WorkflowRunning,
		StartTime:    e.clock.Now(),
		Attempt:      prevRec.Attempt + 1,
		Parent:       &prev,
		SearchAttrs:  prevRec.SearchAttrs,
		Memo:         prevRec.Memo,
	}
	if err := e.store.CreateWorkflow(ctx, rec); err != nil {
		return err
	}
	startEv := history.Event{Kind: history.WorkflowStarted, Workflow: new, Namespace: ns, Time: e.clock.Now()}
	if err := startEv.Encode(&history.WorkflowStartedAttrs{
		WorkflowType: prevRec.WorkflowType,
		TaskQueue:    prevRec.TaskQueue,
		Input:        attrs.NewInput,
		Parent:       &prev,
		SearchAttrs:  prevRec.SearchAttrs,
		Memo:         prevRec.Memo,
	}); err != nil {
		return err
	}
	if _, err := e.store.AppendEvents(ctx, new, []history.Event{startEv}); err != nil {
		return err
	}
	_, err = e.store.EnqueueTask(ctx, storage.Task{
		Kind:      storage.TaskDecision,
		Namespace: ns,
		TaskQueue: prevRec.TaskQueue,
		Execution: new,
	})
	return err
}

func (e *Engine) CompleteActivityTask(ctx context.Context, taskID int64, exec types.Execution, activityID types.ActivityID, result types.Payload, fail *types.Failure) error {
	mu := e.lockFor(exec)
	mu.Lock()
	defer mu.Unlock()
	rec, err := e.store.GetWorkflow(ctx, types.DefaultNamespace, exec)
	if err != nil {
		return err
	}
	ns := rec.Namespace

	if fail != nil {
		retry, attempts, _ := e.activityRetryFor(ctx, exec, activityID)
		if d, ok := NextRetry(retry, attempts); ok && IsRetryable(retry, fail.Type, "") {

			if err := e.store.NackTask(ctx, taskID, d); err != nil {
				return err
			}
			e.met.inc(e.met.tasksRetried)
			return nil
		}
	}

	var ev history.Event
	if fail != nil {
		ev = history.Event{Kind: history.ActivityFailedKind, Workflow: exec, Namespace: ns, Time: e.clock.Now()}
		if err := ev.Encode(&history.ActivityFailedAttrs{
			ActivityID: activityID, Failure: fail, Attempt: 1,
		}); err != nil {
			return err
		}
	} else {
		ev = history.Event{Kind: history.ActivityCompletedKind, Workflow: exec, Namespace: ns, Time: e.clock.Now()}
		if err := ev.Encode(&history.ActivityCompletedAttrs{
			ActivityID: activityID, Result: result,
		}); err != nil {
			return err
		}
	}
	if _, err := e.store.AppendEvents(ctx, exec, []history.Event{ev}); err != nil {
		return err
	}
	if _, err := e.store.EnqueueTask(ctx, storage.Task{
		Kind:      storage.TaskDecision,
		Namespace: ns,
		TaskQueue: rec.TaskQueue,
		Execution: exec,
	}); err != nil {
		return err
	}
	e.met.inc(e.met.tasksEnqueued)
	return e.store.CompleteTask(ctx, taskID)
}

func (e *Engine) activityRetryFor(ctx context.Context, exec types.Execution, activityID types.ActivityID) (types.RetryPolicy, int, error) {
	hist, err := e.store.GetHistory(ctx, exec, 0, 0)
	if err != nil {
		return types.RetryPolicy{}, 0, err
	}
	var (
		retry    types.RetryPolicy
		attempts int
	)
	for _, ev := range hist {
		switch ev.Kind {
		case history.ActivityScheduledKind:
			a := &history.ActivityScheduledAttrs{}
			if err := ev.DecodeInto(a); err != nil {
				continue
			}
			if a.ActivityID == activityID {
				retry = a.Options.Retry
			}
		case history.ActivityStartedKind:
			a := &history.ActivityStartedAttrs{}
			if err := ev.DecodeInto(a); err != nil {
				continue
			}
			if a.ActivityID == activityID {
				attempts++
			}
		}
	}
	return retry, attempts, nil
}

func nextActivityID(ctx context.Context, store storage.Store, exec types.Execution) types.ActivityID {
	hist, err := store.GetHistory(ctx, exec, 0, 0)
	if err != nil {
		return 1
	}
	var max types.ActivityID = 0
	for _, e := range hist {
		if e.Kind != history.ActivityScheduledKind {
			continue
		}
		attrs := &history.ActivityScheduledAttrs{}
		if err := e.DecodeInto(attrs); err != nil {
			continue
		}
		if attrs.ActivityID > max {
			max = attrs.ActivityID
		}
	}
	return max + 1
}
