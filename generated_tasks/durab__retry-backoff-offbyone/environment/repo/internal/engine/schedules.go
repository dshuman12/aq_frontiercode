package engine

import (
	"context"
	"fmt"
	"time"

	"github.com/vishaljakhar/durab/internal/cron"
	"github.com/vishaljakhar/durab/internal/errs"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

type CreateScheduleRequest struct {
	ID           string
	Namespace    types.Namespace
	Spec         string
	WorkflowID   types.WorkflowID
	WorkflowType string
	TaskQueue    types.TaskQueue
	Input        types.Payload
	Memo         map[string]any
}

func (e *Engine) CreateSchedule(ctx context.Context, req CreateScheduleRequest) error {
	if req.ID == "" {
		return fmt.Errorf("%w: schedule id required", errs.Invalid)
	}
	s, err := cron.Parse(req.Spec)
	if err != nil {
		return fmt.Errorf("%w: cron: %v", errs.Invalid, err)
	}
	if req.Namespace == "" {
		req.Namespace = types.DefaultNamespace
	}
	if req.TaskQueue == "" {
		req.TaskQueue = "default"
	}
	next := s.Next(e.clock.Now())
	return e.store.CreateSchedule(ctx, storage.Schedule{
		ID:           req.ID,
		Namespace:    req.Namespace,
		Spec:         req.Spec,
		WorkflowID:   req.WorkflowID,
		WorkflowType: req.WorkflowType,
		TaskQueue:    req.TaskQueue,
		Input:        req.Input,
		Memo:         req.Memo,
		NextRun:      next,
	})
}

func (e *Engine) DeleteSchedule(ctx context.Context, ns types.Namespace, id string) error {
	return e.store.DeleteSchedule(ctx, ns, id)
}

func (e *Engine) PauseSchedule(ctx context.Context, ns types.Namespace, id string, paused bool) error {
	return e.store.PauseSchedule(ctx, ns, id, paused)
}

func (e *Engine) ListSchedules(ctx context.Context, ns types.Namespace) ([]storage.Schedule, error) {
	return e.store.ListSchedules(ctx, ns)
}

func (e *Engine) RunSchedules(ctx context.Context, batch int) (int, error) {
	if batch <= 0 {
		batch = 32
	}
	now := e.clock.Now()
	due, err := e.store.DueSchedules(ctx, now, batch)
	if err != nil {
		return 0, err
	}
	started := 0
	for _, sc := range due {
		spec, err := cron.Parse(sc.Spec)
		if err != nil {
			e.log.Warn(ctx, "bad schedule spec", "id", sc.ID, "spec", sc.Spec)
			continue
		}
		wid := sc.WorkflowID
		if wid == "" {
			wid = types.WorkflowID(sc.ID + "-" + now.UTC().Format("20060102T150405"))
		}
		_, err = e.StartWorkflow(ctx, StartRequest{
			Namespace:    sc.Namespace,
			WorkflowID:   wid,
			WorkflowType: sc.WorkflowType,
			TaskQueue:    sc.TaskQueue,
			Input:        sc.Input,
			Options: types.WorkflowOptions{
				Memo: sc.Memo,
			},
		})
		if err != nil {
			e.log.Warn(ctx, "schedule start failed", "id", sc.ID, "err", err)
		} else {
			started++
		}
		next := spec.Next(now)
		_ = e.store.UpdateScheduleRun(ctx, sc.Namespace, sc.ID, now, next)
	}
	return started, nil
}

func (e *Engine) ScheduleLoop(ctx context.Context, interval time.Duration) error {
	if interval <= 0 {
		interval = time.Second
	}
	t := e.clock.NewTimer(interval)
	defer t.Stop()
	for {
		if _, err := e.RunSchedules(ctx, 0); err != nil {
			e.log.Warn(ctx, "schedule loop", "err", err)
		}
		t.Reset(interval)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C():
		}
	}
}
