package types

type WorkflowID string

type RunID string

type ActivityID uint64

type TaskQueue string

type Namespace string

const DefaultNamespace Namespace = "default"

func (w WorkflowID) String() string { return string(w) }
func (r RunID) String() string      { return string(r) }
func (t TaskQueue) String() string  { return string(t) }
func (n Namespace) String() string  { return string(n) }
