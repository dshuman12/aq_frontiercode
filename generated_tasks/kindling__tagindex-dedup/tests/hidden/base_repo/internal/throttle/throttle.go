// Package throttle implements a token-bucket throttler used to bound
// the rate at which slow paths (re-indexing, snapshot upload) consume
// resources.
package throttle

import (
	"errors"
	"sync"
	"time"
)

// Bucket is a token bucket.
type Bucket struct {
	mu       sync.Mutex
	tokens   float64
	capacity float64
	rate     float64
	last     time.Time
	now      func() time.Time
}

// New constructs a Bucket with the given capacity and refill rate
// (tokens/sec).
func New(capacity, rate float64) (*Bucket, error) {
	if capacity <= 0 || rate <= 0 {
		return nil, errors.New("throttle: capacity and rate must be > 0")
	}
	return &Bucket{
		tokens:   capacity,
		capacity: capacity,
		rate:     rate,
		last:     time.Now(),
		now:      time.Now,
	}, nil
}

// SetClock overrides the time source.
func (b *Bucket) SetClock(fn func() time.Time) { b.now = fn; b.last = fn() }

// Allow returns true if n tokens are available; consumes them on success.
func (b *Bucket) Allow(n float64) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.refillLocked()
	if b.tokens >= n {
		b.tokens -= n
		return true
	}
	return false
}

// Wait returns the duration until n tokens become available without
// actually waiting; callers may use it to schedule a Sleep.
func (b *Bucket) Wait(n float64) time.Duration {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.refillLocked()
	if b.tokens >= n {
		return 0
	}
	deficit := n - b.tokens
	return time.Duration(deficit / b.rate * float64(time.Second))
}

// Tokens returns the currently available tokens.
func (b *Bucket) Tokens() float64 {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.refillLocked()
	return b.tokens
}

func (b *Bucket) refillLocked() {
	now := b.now()
	elapsed := now.Sub(b.last).Seconds()
	if elapsed > 0 {
		b.tokens += elapsed * b.rate
		if b.tokens > b.capacity {
			b.tokens = b.capacity
		}
		b.last = now
	}
}
