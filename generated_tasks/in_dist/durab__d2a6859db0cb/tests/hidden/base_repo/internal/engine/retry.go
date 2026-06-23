package engine

import (
	"math"
	"time"

	"github.com/vishaljakhar/durab/pkg/types"
)

// NextRetry returns the delay before attempt n+1 according to policy.
// Attempt is 1-based: the first failure has attempt=1 and yields
// the delay before the SECOND attempt.
//
// Caps:
//   - MaxAttempts: if reached or exceeded, returns (0, false). The caller
//     should mark the work as permanently failed.
//   - MaxInterval: bounds the per-attempt wait.
//
// A zero policy never retries.
func NextRetry(p types.RetryPolicy, attempt int) (time.Duration, bool) {
	if p.IsZero() {
		return 0, false
	}
	if p.MaxAttempts > 0 && attempt >= p.MaxAttempts {
		return 0, false
	}
	if p.InitialInterval <= 0 {
		p.InitialInterval = time.Second
	}
	if p.BackoffCoefficient <= 0 {
		p.BackoffCoefficient = 2.0
	}
	d := float64(p.InitialInterval) * math.Pow(p.BackoffCoefficient, float64(attempt-1))
	if p.MaxInterval > 0 && d > float64(p.MaxInterval) {
		d = float64(p.MaxInterval)
	}
	return time.Duration(d), true
}

// IsRetryable returns whether a failure of type ft should be retried under
// policy p. Application errors are retryable by default; timeouts and panics
// are retryable; cancel and termination are not.
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
