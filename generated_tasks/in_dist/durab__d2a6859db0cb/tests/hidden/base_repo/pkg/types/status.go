package types

// WorkflowStatus is the terminal-or-running state of a workflow run.
type WorkflowStatus string

const (
	WorkflowRunning      WorkflowStatus = "running"
	WorkflowCompleted    WorkflowStatus = "completed"
	WorkflowFailed       WorkflowStatus = "failed"
	WorkflowCanceled     WorkflowStatus = "canceled"
	WorkflowTerminated   WorkflowStatus = "terminated"
	WorkflowTimedOut     WorkflowStatus = "timed_out"
	WorkflowContinuedAsNew WorkflowStatus = "continued_as_new"
)

// IsTerminal reports whether s is a terminal status (no further events will
// be recorded for that run).
func (s WorkflowStatus) IsTerminal() bool {
	switch s {
	case WorkflowCompleted, WorkflowFailed, WorkflowCanceled,
		WorkflowTerminated, WorkflowTimedOut, WorkflowContinuedAsNew:
		return true
	}
	return false
}

// ActivityStatus is the state of a single activity invocation.
type ActivityStatus string

const (
	ActivityScheduled ActivityStatus = "scheduled"
	ActivityStarted   ActivityStatus = "started"
	ActivityCompleted ActivityStatus = "completed"
	ActivityFailed    ActivityStatus = "failed"
	ActivityCanceled  ActivityStatus = "canceled"
	ActivityTimedOut  ActivityStatus = "timed_out"
)
