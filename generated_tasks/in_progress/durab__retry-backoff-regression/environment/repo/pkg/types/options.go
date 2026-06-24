package types

import "time"

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

type IDReusePolicy string

const (
	IDReuseAllowDuplicate           IDReusePolicy = "allow_duplicate"
	IDReuseAllowDuplicateFailedOnly IDReusePolicy = "allow_duplicate_failed_only"
	IDReuseRejectDuplicate          IDReusePolicy = "reject_duplicate"
)

type ActivityOptions struct {
	TaskQueue              TaskQueue
	ScheduleToCloseTimeout time.Duration
	ScheduleToStartTimeout time.Duration
	StartToCloseTimeout    time.Duration
	HeartbeatTimeout       time.Duration
	Retry                  RetryPolicy
}
