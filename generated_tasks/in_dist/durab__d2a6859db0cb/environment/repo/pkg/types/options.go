package types

import "time"

// WorkflowOptions controls how a workflow is started and executed.
type WorkflowOptions struct {
	ID            WorkflowID
	TaskQueue     TaskQueue
	Namespace     Namespace
	Retry         RetryPolicy
	RunTimeout    time.Duration
	TaskTimeout   time.Duration
	SearchAttrs   map[string]any
	Memo          map[string]any
	CronSchedule  string
	IDReusePolicy IDReusePolicy
}

// IDReusePolicy controls whether a workflow ID can be reused for a new run.
type IDReusePolicy string

const (
	IDReuseAllowDuplicate         IDReusePolicy = "allow_duplicate"
	IDReuseAllowDuplicateFailedOnly IDReusePolicy = "allow_duplicate_failed_only"
	IDReuseRejectDuplicate        IDReusePolicy = "reject_duplicate"
)

// ActivityOptions controls how an activity invocation is executed.
type ActivityOptions struct {
	TaskQueue            TaskQueue
	ScheduleToCloseTimeout time.Duration
	ScheduleToStartTimeout time.Duration
	StartToCloseTimeout    time.Duration
	HeartbeatTimeout       time.Duration
	Retry                  RetryPolicy
}
