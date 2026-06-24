package circuit

import (
	"errors"
	"sync"
	"time"
)

var (
	ErrOpen    = errors.New("circuit: breaker is open")
	ErrTooMany = errors.New("circuit: too many requests in half-open")
)

// State represents the circuit breaker state.
type State int

const (
	StateClosed State = iota
	StateOpen
	StateHalfOpen
)

func (s State) String() string {
	switch s {
	case StateClosed:
		return "closed"
	case StateOpen:
		return "open"
	case StateHalfOpen:
		return "half-open"
	default:
		return "unknown"
	}
}

// Counts tracks successes and failures.
type Counts struct {
	Requests         uint64
	Successes        uint64
	Failures         uint64
	ConsecutiveFails uint64
	ConsecutiveOK    uint64
}

// Breaker implements the circuit breaker pattern.
type Breaker struct {
	mu               sync.Mutex
	state            State
	counts           Counts
	failThreshold    uint64
	successThreshold uint64
	timeout          time.Duration
	openSince        time.Time
	halfOpenMax      uint64
	halfOpenCurrent  uint64
	onStateChange    func(from, to State)
}

// Option configures a Breaker.
type Option func(*Breaker)

// WithFailThreshold sets failures needed to open the circuit.
func WithFailThreshold(n uint64) Option {
	return func(b *Breaker) { b.failThreshold = n }
}

// WithSuccessThreshold sets successes in half-open needed to close.
func WithSuccessThreshold(n uint64) Option {
	return func(b *Breaker) { b.successThreshold = n }
}

// WithTimeout sets how long the circuit stays open before half-opening.
func WithTimeout(d time.Duration) Option {
	return func(b *Breaker) { b.timeout = d }
}

// WithHalfOpenMax sets max concurrent requests in half-open state.
func WithHalfOpenMax(n uint64) Option {
	return func(b *Breaker) { b.halfOpenMax = n }
}

// WithOnStateChange sets a callback for state transitions.
func WithOnStateChange(fn func(from, to State)) Option {
	return func(b *Breaker) { b.onStateChange = fn }
}

// NewBreaker creates a circuit breaker with the given options.
func NewBreaker(opts ...Option) *Breaker {
	b := &Breaker{
		state:            StateClosed,
		failThreshold:    5,
		successThreshold: 2,
		timeout:          10 * time.Second,
		halfOpenMax:      1,
	}
	for _, o := range opts {
		o(b)
	}
	return b
}

// Execute runs fn if the circuit allows it.
func (b *Breaker) Execute(fn func() error) error {
	if err := b.beforeRequest(); err != nil {
		return err
	}
	err := fn()
	b.afterRequest(err)
	return err
}

// State returns the current state.
func (b *Breaker) CurrentState() State {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.state == StateOpen && time.Since(b.openSince) >= b.timeout {
		b.transition(StateHalfOpen)
	}
	return b.state
}

// Counts returns current counters.
func (b *Breaker) CurrentCounts() Counts {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.counts
}

// Reset forces the breaker to closed state.
func (b *Breaker) Reset() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.transition(StateClosed)
	b.counts = Counts{}
	b.halfOpenCurrent = 0
}

func (b *Breaker) beforeRequest() error {
	b.mu.Lock()
	defer b.mu.Unlock()
	switch b.state {
	case StateClosed:
		b.counts.Requests++
		return nil
	case StateOpen:
		if time.Since(b.openSince) >= b.timeout {
			b.transition(StateHalfOpen)
			b.halfOpenCurrent = 1
			b.counts.Requests++
			return nil
		}
		return ErrOpen
	case StateHalfOpen:
		if b.halfOpenCurrent >= b.halfOpenMax {
			return ErrTooMany
		}
		b.halfOpenCurrent++
		b.counts.Requests++
		return nil
	}
	return nil
}

func (b *Breaker) afterRequest(err error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if err == nil {
		b.onSuccess()
	} else {
		b.onFailure()
	}
}

func (b *Breaker) onSuccess() {
	b.counts.Successes++
	b.counts.ConsecutiveOK++
	b.counts.ConsecutiveFails = 0
	if b.state == StateHalfOpen && b.counts.ConsecutiveOK >= b.successThreshold {
		b.transition(StateClosed)
		b.counts = Counts{}
		b.halfOpenCurrent = 0
	}
}

func (b *Breaker) onFailure() {
	b.counts.Failures++
	b.counts.ConsecutiveFails++
	b.counts.ConsecutiveOK = 0
	switch b.state {
	case StateClosed:
		if b.counts.ConsecutiveFails >= b.failThreshold {
			b.transition(StateOpen)
			b.openSince = time.Now()
			b.counts = Counts{}
		}
	case StateHalfOpen:
		b.transition(StateOpen)
		b.openSince = time.Now()
		b.counts = Counts{}
		b.halfOpenCurrent = 0
	}
}

func (b *Breaker) transition(to State) {
	if b.state == to {
		return
	}
	from := b.state
	b.state = to
	if b.onStateChange != nil {
		b.onStateChange(from, to)
	}
}
