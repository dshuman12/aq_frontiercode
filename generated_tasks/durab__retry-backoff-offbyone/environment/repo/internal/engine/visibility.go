package engine

import (
	"context"

	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/internal/storage"
	"github.com/vishaljakhar/durab/pkg/types"
)

type HistoryPage struct {
	Events     []history.Event
	NextFromID history.EventID
	HasMore    bool
}

func (e *Engine) GetHistoryPaged(ctx context.Context, exec types.Execution, fromID history.EventID, pageSize int) (HistoryPage, error) {
	if pageSize <= 0 {
		pageSize = 100
	}
	hist, err := e.store.GetHistory(ctx, exec, fromID, fromID+history.EventID(pageSize)-1)
	if err != nil {
		return HistoryPage{}, err
	}
	last, _ := e.store.LastEventID(ctx, exec)
	page := HistoryPage{Events: hist}
	if len(hist) > 0 {
		page.NextFromID = hist[len(hist)-1].ID + 1
		page.HasMore = hist[len(hist)-1].ID < last
	}
	return page, nil
}

func (e *Engine) CountRunning(ctx context.Context, ns types.Namespace) (int, error) {
	rs, err := e.store.ListWorkflows(ctx, storage.WorkflowFilter{
		Namespace: ns,
		Status:    types.WorkflowRunning,
	})
	if err != nil {
		return 0, err
	}
	return len(rs), nil
}
