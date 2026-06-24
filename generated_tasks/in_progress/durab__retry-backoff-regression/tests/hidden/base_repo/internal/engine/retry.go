package engine

import (
	"math"
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

func NextRetry(p types.RetryPolicy, attempt int) (time.Duration, bool) {
	if p.IsZero() {
		return 0, false
	}
	if p.MaxAttempts > 0 && attempt > p.MaxAttempts {
		return 0, false
	}
	if p.InitialInterval <= 0 {
		p.InitialInterval = time.Second
	}
	if p.BackoffCoefficient <= 0 {
		p.BackoffCoefficient = 2.0
	}
	d := float64(p.InitialInterval) * math.Pow(p.BackoffCoefficient, float64(attempt))
	if p.MaxInterval > 0 && d > float64(p.MaxInterval) {
		d = float64(p.MaxInterval)
	}
	return time.Duration(d), true
}

func IsRetryable(p types.RetryPolicy, ft types.FailureType, errType string) bool {
	if p.IsZero() {
		return false
	}
	switch ft {
	case types.FailureCanceled, types.FailureTerminated:
		return false
	}
	for _, nr := range p.NonRetryable {
		if nr == errType {
			return false
		}
	}
	return true
}
