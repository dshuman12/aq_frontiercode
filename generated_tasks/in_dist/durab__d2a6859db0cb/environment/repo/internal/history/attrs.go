package history

import (
	"encoding/json"
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

// WorkflowStartedAttrs is the payload for WorkflowStarted.
type WorkflowStartedAttrs struct {
	WorkflowType string             `json:"workflow_type"`
	TaskQueue    types.TaskQueue    `json:"task_queue"`
	Input        types.Payload      `json:"input,omitempty"`
	Retry        types.RetryPolicy  `json:"retry,omitempty"`
	RunTimeout   time.Duration      `json:"run_timeout,omitempty"`
	Parent       *types.Execution   `json:"parent,omitempty"`
	SearchAttrs  map[string]any     `json:"search_attrs,omitempty"`
	Memo         map[string]any     `json:"memo,omitempty"`
}

type WorkflowCompletedAttrs struct {
	Result types.Payload `json:"result,omitempty"`
}

type WorkflowFailedAttrs struct {
	Failure *types.Failure `json:"failure,omitempty"`
}

type WorkflowContinuedAsNewAttrs struct {
	NewRunID   types.RunID   `json:"new_run_id"`
	NewInput   types.Payload `json:"new_input,omitempty"`
	Reason     string        `json:"reason,omitempty"`
}

type ActivityScheduledAttrs struct {
	ActivityID   types.ActivityID  `json:"activity_id"`
	ActivityType string            `json:"activity_type"`
	TaskQueue    types.TaskQueue   `json:"task_queue"`
	Input        types.Payload     `json:"input,omitempty"`
	Options      types.ActivityOptions `json:"options"`
}

type ActivityStartedAttrs struct {
	ActivityID types.ActivityID `json:"activity_id"`
	Attempt    int              `json:"attempt"`
	WorkerID   string           `json:"worker_id,omitempty"`
}

type ActivityCompletedAttrs struct {
	ActivityID types.ActivityID `json:"activity_id"`
	Result     types.Payload    `json:"result,omitempty"`
}

type ActivityFailedAttrs struct {
	ActivityID types.ActivityID `json:"activity_id"`
	Failure    *types.Failure   `json:"failure,omitempty"`
	Attempt    int              `json:"attempt"`
}

type TimerStartedAttrs struct {
	TimerID  string        `json:"timer_id"`
	Duration time.Duration `json:"duration"`
}

type TimerFiredAttrs struct {
	TimerID string `json:"timer_id"`
}

type TimerCanceledAttrs struct {
	TimerID string `json:"timer_id"`
}

type SignalReceivedAttrs struct {
	Name    string        `json:"name"`
	Input   types.Payload `json:"input,omitempty"`
	Source  string        `json:"source,omitempty"`
}

type ChildWorkflowScheduledAttrs struct {
	ChildID      types.WorkflowID `json:"child_id"`
	WorkflowType string           `json:"workflow_type"`
	Input        types.Payload    `json:"input,omitempty"`
}

type ChildWorkflowCompletedAttrs struct {
	Exec   types.Execution `json:"exec"`
	Result types.Payload   `json:"result,omitempty"`
}

type MarkerRecordedAttrs struct {
	Name string          `json:"name"`
	Data json.RawMessage `json:"data,omitempty"`
}
