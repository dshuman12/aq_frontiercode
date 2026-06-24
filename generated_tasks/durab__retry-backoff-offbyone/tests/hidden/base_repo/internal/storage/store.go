package storage

import (
	"context"
	"time"

	"github.com/vishaljakhar/durab/internal/history"
	"github.com/vishaljakhar/durab/pkg/types"
)

type Store interface {
	WorkflowStore
	HistoryStore
	TaskStore
	TimerStore
	ScheduleStore
	Close() error
}

type Schedule struct {
	ID           string
	Namespace    types.Namespace
	Spec         string
	WorkflowID   types.WorkflowID
	WorkflowType string
	TaskQueue    types.TaskQueue
	Input        types.Payload
	Memo         map[string]any
	Created      time.Time
	NextRun      time.Time
	LastRun      time.Time
	Paused       bool
}

type ScheduleStore interface {
	CreateSchedule(ctx context.Context, sc Schedule) error
	GetSchedule(ctx context.Context, ns types.Namespace, id string) (Schedule, error)
	DeleteSchedule(ctx context.Context, ns types.Namespace, id string) error
	UpdateScheduleRun(ctx context.Context, ns types.Namespace, id string, lastRun, nextRun time.Time) error
	PauseSchedule(ctx context.Context, ns types.Namespace, id string, paused bool) error
	ListSchedules(ctx context.Context, ns types.Namespace) ([]Schedule, error)
	DueSchedules(ctx context.Context, now time.Time, limit int) ([]Schedule, error)
}

type WorkflowRecord struct {
	Namespace    types.Namespace
	Execution    types.Execution
	WorkflowType string
	TaskQueue    types.TaskQueue
	Status       types.WorkflowStatus
	StartTime    time.Time
	CloseTime    time.Time
	Attempt      int
	Parent       *types.Execution
	SearchAttrs  map[string]any
	Memo         map[string]any
}

type WorkflowStore interface {
	CreateWorkflow(ctx context.Context, w WorkflowRecord) error
	GetWorkflow(ctx context.Context, ns types.Namespace, exec types.Execution) (WorkflowRecord, error)
	UpdateWorkflowStatus(ctx context.Context, ns types.Namespace, exec types.Execution, status types.WorkflowStatus, closeAt time.Time) error
	ListWorkflows(ctx context.Context, f WorkflowFilter) ([]WorkflowRecord, error)
}

type WorkflowFilter struct {
	Namespace types.Namespace
	TaskQueue types.TaskQueue
	Status    types.WorkflowStatus
	After     time.Time
	Before    time.Time
	Limit     int

	SearchAttrKey   string
	SearchAttrValue any
}

type HistoryStore interface {
	AppendEvents(ctx context.Context, exec types.Execution, events []history.Event) ([]history.Event, error)
	GetHistory(ctx context.Context, exec types.Execution, fromID, toID history.EventID) ([]history.Event, error)
	LastEventID(ctx context.Context, exec types.Execution) (history.EventID, error)
}

type TaskKind string

const (
	TaskDecision TaskKind = "decision"
	TaskActivity TaskKind = "activity"
)

type Task struct {
	ID         int64
	Kind       TaskKind
	Namespace  types.Namespace
	TaskQueue  types.TaskQueue
	Execution  types.Execution
	ActivityID types.ActivityID
	EventID    history.EventID
	VisibleAt  time.Time
	Attempts   int
}

type TaskStore interface {
	EnqueueTask(ctx context.Context, t Task) (int64, error)
	DequeueTask(ctx context.Context, kind TaskKind, queue types.TaskQueue, workerID string, lease time.Duration) (Task, bool, error)
	CompleteTask(ctx context.Context, id int64) error
	NackTask(ctx context.Context, id int64, retryAfter time.Duration) error

	PendingTasks(ctx context.Context, kind TaskKind, queue types.TaskQueue) (int, error)
}

type TimerStore interface {
	ScheduleTimer(ctx context.Context, exec types.Execution, timerID string, fireAt time.Time) error
	DueTimers(ctx context.Context, now time.Time, limit int) ([]DueTimer, error)
	DeleteTimer(ctx context.Context, exec types.Execution, timerID string) error
}

type DueTimer struct {
	Namespace types.Namespace
	Execution types.Execution
	TimerID   string
	FireAt    time.Time
}
