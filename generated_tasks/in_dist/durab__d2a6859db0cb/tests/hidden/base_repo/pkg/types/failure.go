package types

// FailureType categorises why an activity or workflow ended unsuccessfully.
// The engine inspects Type to decide whether to retry; "application" errors
// are retryable by default, all others terminate immediately.
type FailureType string

const (
	FailureApplication FailureType = "application"
	FailureTimeout     FailureType = "timeout"
	FailurePanic       FailureType = "panic"
	FailureCanceled    FailureType = "canceled"
	FailureTerminated  FailureType = "terminated"
	FailureServer      FailureType = "server"
)

// Failure describes a non-success outcome. It is intentionally serialisable
// so it can be persisted in history and replayed.
type Failure struct {
	Type    FailureType `json:"type"`
	Message string      `json:"message"`
	// Stack is an opaque, runtime-dependent trace. Workflows must not branch
	// on its contents (it is not deterministic across replays).
	Stack    string   `json:"stack,omitempty"`
	Cause    *Failure `json:"cause,omitempty"`
	Source   string   `json:"source,omitempty"`
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
