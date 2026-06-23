package types

import "time"

// Execution names a specific run of a workflow.
type Execution struct {
	WorkflowID WorkflowID `json:"workflow_id"`
	RunID      RunID      `json:"run_id"`
}

func (e Execution) String() string {
	return string(e.WorkflowID) + "/" + string(e.RunID)
}

// Info is the metadata for a workflow run that is safe to expose to API
// clients and to workflows themselves (via deterministic host functions).
type Info struct {
	Execution     Execution
	Namespace     Namespace
	TaskQueue     TaskQueue
	WorkflowType  string
	StartTime     time.Time
	CloseTime     time.Time
	Status        WorkflowStatus
	HistoryLength int
	Attempt       int
	ParentExec    *Execution `json:",omitempty"`
}
