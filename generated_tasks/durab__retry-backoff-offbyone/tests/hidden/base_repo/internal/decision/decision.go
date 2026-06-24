package decision

import (
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

type Kind string

const (
	KindScheduleActivity Kind = "schedule_activity"
	KindStartTimer       Kind = "start_timer"
	KindCancelTimer      Kind = "cancel_timer"
	KindCompleteWorkflow Kind = "complete_workflow"
	KindFailWorkflow     Kind = "fail_workflow"
	KindContinueAsNew    Kind = "continue_as_new"
	KindStartChild       Kind = "start_child"
	KindRecordMarker     Kind = "record_marker"
)

type Decision struct {
	Kind Kind `json:"kind"`

	ScheduleActivity *ScheduleActivity `json:"schedule_activity,omitempty"`
	StartTimer       *StartTimer       `json:"start_timer,omitempty"`
	CancelTimer      *CancelTimer      `json:"cancel_timer,omitempty"`
	CompleteWorkflow *CompleteWorkflow `json:"complete_workflow,omitempty"`
	FailWorkflow     *FailWorkflow     `json:"fail_workflow,omitempty"`
	ContinueAsNew    *ContinueAsNew    `json:"continue_as_new,omitempty"`
	StartChild       *StartChild       `json:"start_child,omitempty"`
	RecordMarker     *RecordMarker     `json:"record_marker,omitempty"`
}

type ScheduleActivity struct {
	ActivityID   types.ActivityID      `json:"activity_id"`
	ActivityType string                `json:"activity_type"`
	TaskQueue    types.TaskQueue       `json:"task_queue"`
	Input        types.Payload         `json:"input"`
	Options      types.ActivityOptions `json:"options"`
}

type StartTimer struct {
	TimerID  string        `json:"timer_id"`
	Duration time.Duration `json:"duration"`
}

type CancelTimer struct {
	TimerID string `json:"timer_id"`
}

type CompleteWorkflow struct {
	Result types.Payload `json:"result"`
}

type FailWorkflow struct {
	Failure *types.Failure `json:"failure"`
}

type ContinueAsNew struct {
	NewInput types.Payload `json:"new_input"`
	Reason   string        `json:"reason,omitempty"`
}

type StartChild struct {
	ChildID      types.WorkflowID `json:"child_id"`
	WorkflowType string           `json:"workflow_type"`
	Input        types.Payload    `json:"input"`
	TaskQueue    types.TaskQueue  `json:"task_queue"`
}

type RecordMarker struct {
	Name string `json:"name"`
	Data []byte `json:"data,omitempty"`
}
