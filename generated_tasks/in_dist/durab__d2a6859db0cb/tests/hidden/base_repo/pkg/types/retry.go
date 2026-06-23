package types

import "time"

// RetryPolicy controls how the engine retries a failed activity or workflow.
// A zero RetryPolicy means "do not retry"; callers should use DefaultRetry
// when they want sensible defaults.
type RetryPolicy struct {
	// InitialInterval is the delay before the first retry attempt.
	InitialInterval time.Duration `json:"initial_interval"`
	// BackoffCoefficient multiplies the interval after each failure.
	BackoffCoefficient float64 `json:"backoff_coefficient"`
	// MaxInterval caps the per-attempt wait. Zero means no cap.
	MaxInterval time.Duration `json:"max_interval"`
	// MaxAttempts is the upper bound on attempts. Zero means unlimited.
	MaxAttempts int `json:"max_attempts"`
	// NonRetryable is a list of error types that, when matched, abort retry.
	NonRetryable []string `json:"non_retryable,omitempty"`
}

// DefaultRetry returns a sensible default policy: 1s, 2x, capped at 100s,
// max 5 attempts.
func DefaultRetry() RetryPolicy {
	return RetryPolicy{
		InitialInterval:    time.Second,
		BackoffCoefficient: 2.0,
		MaxInterval:        100 * time.Second,
		MaxAttempts:        5,
	}
}

// IsZero reports whether the policy is the zero value.
func (p RetryPolicy) IsZero() bool {
	return p.InitialInterval == 0 && p.BackoffCoefficient == 0 &&
		p.MaxInterval == 0 && p.MaxAttempts == 0 && len(p.NonRetryable) == 0
}
