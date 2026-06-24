package types

import "time"

type Execution struct {
	WorkflowID WorkflowID `json:"workflow_id"`
	RunID      RunID      `json:"run_id"`
}

func (e Execution) String() string {
	return string(e.WorkflowID) + "/" + string(e.RunID)
}

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
