package retry

import (
	"math"
	"math/rand"
	"sync"
	"time"
)

// Policy defines how to retry a failed operation.
type Policy struct {
	MaxAttempts int
	InitialWait time.Duration
	MaxWait     time.Duration
	Multiplier  float64
	JitterFrac  float64
	rng         *rand.Rand
	mu          sync.Mutex
}

// NewExponentialBackoff creates a policy with exponential backoff and jitter.
func NewExponentialBackoff(maxAttempts int, initialWait, maxWait time.Duration) *Policy {
	return &Policy{
		MaxAttempts: maxAttempts,
		InitialWait: initialWait,
		MaxWait:     maxWait,
		Multiplier:  2.0,
		JitterFrac:  0.1,
		rng:         rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// NewConstantBackoff creates a policy with constant wait between retries.
func NewConstantBackoff(maxAttempts int, wait time.Duration) *Policy {
	return &Policy{
		MaxAttempts: maxAttempts,
		InitialWait: wait,
		MaxWait:     wait,
		Multiplier:  1.0,
		JitterFrac:  0,
		rng:         rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// NewLinearBackoff creates a policy with linearly increasing wait.
func NewLinearBackoff(maxAttempts int, initialWait, increment time.Duration) *Policy {
	return &Policy{
		MaxAttempts: maxAttempts,
		InitialWait: initialWait,
		MaxWait:     initialWait + time.Duration(maxAttempts)*increment,
		Multiplier:  1.0,
		JitterFrac:  0,
		rng:         rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// WithJitter sets the jitter fraction (0.0 to 1.0).
func (p *Policy) WithJitter(frac float64) *Policy {
	if frac < 0 { frac = 0 }
	if frac > 1 { frac = 1 }
	p.JitterFrac = frac
	return p
}

// WithMultiplier sets the backoff multiplier.
func (p *Policy) WithMultiplier(m float64) *Policy {
	if m < 1 { m = 1 }
	p.Multiplier = m
	return p
}

// Delay returns the wait duration for the given attempt number (0-based).
func (p *Policy) Delay(attempt int) time.Duration {
	if attempt < 0 { attempt = 0 }
	base := float64(p.InitialWait) * math.Pow(p.Multiplier, float64(attempt))
	if base > float64(p.MaxWait) {
		base = float64(p.MaxWait)
	}
	if p.JitterFrac > 0 {
		p.mu.Lock()
		jitter := base * p.JitterFrac * (p.rng.Float64()*2 - 1)
		p.mu.Unlock()
		base += jitter
	}
	if base < 0 { base = 0 }
	return time.Duration(base)
}

// ShouldRetry returns true if more attempts remain.
func (p *Policy) ShouldRetry(attempt int) bool {
	return attempt < p.MaxAttempts-1
}

// Result holds the outcome of a retried operation.
type Result struct {
	Value    interface{}
	Err      error
	Attempts int
	Duration time.Duration
}

// Do executes fn with retries according to the policy.
// It stops on success (nil error) or when attempts are exhausted.
func (p *Policy) Do(fn func() error) Result {
	start := time.Now()
	var lastErr error
	for attempt := 0; attempt < p.MaxAttempts; attempt++ {
		lastErr = fn()
		if lastErr == nil {
			return Result{Attempts: attempt + 1, Duration: time.Since(start)}
		}
		if attempt < p.MaxAttempts-1 {
			time.Sleep(p.Delay(attempt))
		}
	}
	return Result{Err: lastErr, Attempts: p.MaxAttempts, Duration: time.Since(start)}
}

// DoWithValue executes fn that returns a value and error.
func (p *Policy) DoWithValue(fn func() (interface{}, error)) Result {
	start := time.Now()
	var lastErr error
	for attempt := 0; attempt < p.MaxAttempts; attempt++ {
		val, err := fn()
		if err == nil {
			return Result{Value: val, Attempts: attempt + 1, Duration: time.Since(start)}
		}
		lastErr = err
		if attempt < p.MaxAttempts-1 {
			time.Sleep(p.Delay(attempt))
		}
	}
	return Result{Err: lastErr, Attempts: p.MaxAttempts, Duration: time.Since(start)}
}

// Schedule returns all delay durations for a full retry sequence.
func (p *Policy) Schedule() []time.Duration {
	delays := make([]time.Duration, 0, p.MaxAttempts-1)
	for i := 0; i < p.MaxAttempts-1; i++ {
		delays = append(delays, p.Delay(i))
	}
	return delays
}
