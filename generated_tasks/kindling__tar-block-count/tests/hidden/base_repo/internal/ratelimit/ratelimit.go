// Package ratelimit provides a token-bucket rate limiter.
package ratelimit

import (
	"sync"
	"time"
)

// Bucket is a token-bucket limiter.
type Bucket struct {
	mu         sync.Mutex
	capacity   float64
	refill     float64
	tokens     float64
	lastRefill time.Time
	now        func() time.Time
}

// New returns a bucket with `capacity` tokens that refill at
// `tokensPerSec` per second.
func New(capacity float64, tokensPerSec float64) *Bucket {
	return &Bucket{
		capacity:   capacity,
		refill:     tokensPerSec,
		tokens:     capacity,
		lastRefill: time.Now(),
		now:        time.Now,
	}
}

// Allow returns true if cost tokens are available, consuming them.
func (b *Bucket) Allow(cost float64) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.refillLocked()
	if b.tokens < cost {
		return false
	}
	b.tokens -= cost
	return true
}

// Tokens returns the current token count.
func (b *Bucket) Tokens() float64 {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.refillLocked()
	return b.tokens
}

// SetNow replaces the clock; tests use this.
func (b *Bucket) SetNow(now func() time.Time) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.now = now
}

func (b *Bucket) refillLocked() {
	now := b.now()
	elapsed := now.Sub(b.lastRefill).Seconds()
	if elapsed <= 0 {
		return
	}
	b.tokens += elapsed * b.refill
	if b.tokens > b.capacity {
		b.tokens = b.capacity
	}
	b.lastRefill = now
}
