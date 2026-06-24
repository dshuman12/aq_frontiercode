package types

import "time"

type RetryPolicy struct {
	InitialInterval time.Duration `json:"initial_interval"`

	BackoffCoefficient float64 `json:"backoff_coefficient"`

	MaxInterval time.Duration `json:"max_interval"`

	MaxAttempts int `json:"max_attempts"`

	NonRetryable []string `json:"non_retryable,omitempty"`
}

func DefaultRetry() RetryPolicy {
	return RetryPolicy{
		InitialInterval:    time.Second,
		BackoffCoefficient: 2.0,
		MaxInterval:        100 * time.Second,
		MaxAttempts:        5,
	}
}

func (p RetryPolicy) IsZero() bool {
	return p.InitialInterval == 0 && p.BackoffCoefficient == 0 &&
		p.MaxInterval == 0 && p.MaxAttempts == 0 && len(p.NonRetryable) == 0
}
