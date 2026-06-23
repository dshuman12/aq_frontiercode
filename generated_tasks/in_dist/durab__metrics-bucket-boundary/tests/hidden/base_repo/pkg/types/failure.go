package types

type FailureType string

const (
	FailureApplication FailureType = "application"
	FailureTimeout     FailureType = "timeout"
	FailurePanic       FailureType = "panic"
	FailureCanceled    FailureType = "canceled"
	FailureTerminated  FailureType = "terminated"
	FailureServer      FailureType = "server"
)

type Failure struct {
	Type    FailureType `json:"type"`
	Message string      `json:"message"`

	Stack  string   `json:"stack,omitempty"`
	Cause  *Failure `json:"cause,omitempty"`
	Source string   `json:"source,omitempty"`
}

func (f *Failure) Error() string {
	if f == nil {
		return "<nil failure>"
	}
	return string(f.Type) + ": " + f.Message
}

func (f *Failure) Unwrap() error {
	if f == nil || f.Cause == nil {
		return nil
	}
	return f.Cause
}
