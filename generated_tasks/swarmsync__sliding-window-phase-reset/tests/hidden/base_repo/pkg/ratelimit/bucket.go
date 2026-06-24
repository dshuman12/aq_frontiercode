package ratelimit

import (
	"sync"
	"time"
)

// TokenBucket implements the token bucket rate limiting algorithm.
// Tokens are added at a fixed rate up to a maximum burst size.
// Each request consumes one or more tokens.
type TokenBucket struct {
	mu         sync.Mutex
	rate       float64   // tokens per second
	burst      int       // max tokens
	tokens     float64   // current token count
	lastRefill time.Time // last time tokens were added
}

// NewTokenBucket creates a bucket that refills at `rate` tokens/sec
// with a maximum burst of `burst` tokens.
func NewTokenBucket(rate float64, burst int) *TokenBucket {
	if rate <= 0 {
		rate = 1
	}
	if burst < 1 {
		burst = 1
	}
	return &TokenBucket{
		rate:       rate,
		burst:      burst,
		tokens:     float64(burst),
		lastRefill: time.Now(),
	}
}

// Allow checks if a single token is available and consumes it.
func (tb *TokenBucket) Allow() bool {
	return tb.AllowN(1)
}

// AllowN checks if n tokens are available and consumes them.
func (tb *TokenBucket) AllowN(n int) bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()
	tb.refill()
	if tb.tokens >= float64(n) {
		tb.tokens -= float64(n)
		return true
	}
	return false
}

// Tokens returns the current number of available tokens.
func (tb *TokenBucket) Tokens() float64 {
	tb.mu.Lock()
	defer tb.mu.Unlock()
	tb.refill()
	return tb.tokens
}

// Rate returns the refill rate in tokens per second.
func (tb *TokenBucket) Rate() float64 {
	return tb.rate
}

// Burst returns the maximum token capacity.
func (tb *TokenBucket) Burst() int {
	return tb.burst
}

// Reset refills the bucket to its maximum capacity.
func (tb *TokenBucket) Reset() {
	tb.mu.Lock()
	defer tb.mu.Unlock()
	tb.tokens = float64(tb.burst)
	tb.lastRefill = time.Now()
}

// refill adds tokens based on elapsed time since last refill.
func (tb *TokenBucket) refill() {
	now := time.Now()
	elapsed := now.Sub(tb.lastRefill).Seconds()
	tb.tokens += elapsed * tb.rate
	if tb.tokens > float64(tb.burst) {
		tb.tokens = float64(tb.burst)
	}
	tb.lastRefill = now
}

// WaitDuration returns how long to wait before n tokens become available.
// Returns 0 if tokens are already available.
func (tb *TokenBucket) WaitDuration(n int) time.Duration {
	tb.mu.Lock()
	defer tb.mu.Unlock()
	tb.refill()
	if tb.tokens >= float64(n) {
		return 0
	}
	deficit := float64(n) - tb.tokens
	return time.Duration(deficit / tb.rate * float64(time.Second))
}

// SetRate changes the refill rate.
func (tb *TokenBucket) SetRate(rate float64) {
	tb.mu.Lock()
	defer tb.mu.Unlock()
	tb.refill()
	if rate > 0 {
		tb.rate = rate
	}
}

// SlidingWindow implements a sliding window rate limiter.
// It counts requests in fixed-size windows and interpolates between
// the current and previous window for smoother rate limiting.
type SlidingWindow struct {
	mu          sync.Mutex
	limit       int
	windowSize  time.Duration
	prevCount   int
	currCount   int
	windowStart time.Time
}

// NewSlidingWindow creates a sliding window limiter allowing `limit`
// requests per `window` duration.
func NewSlidingWindow(limit int, window time.Duration) *SlidingWindow {
	if limit < 1 {
		limit = 1
	}
	if window <= 0 {
		window = time.Second
	}
	return &SlidingWindow{
		limit:       limit,
		windowSize:  window,
		windowStart: time.Now(),
	}
}

// Allow checks if a request is within the rate limit.
func (sw *SlidingWindow) Allow() bool {
	sw.mu.Lock()
	defer sw.mu.Unlock()
	sw.advance()

	elapsed := time.Since(sw.windowStart)
	weight := elapsed.Seconds() / sw.windowSize.Seconds()
	if weight > 1 {
		weight = 1
	}
	estimate := float64(sw.prevCount)*(1-weight) + float64(sw.currCount)
	if estimate >= float64(sw.limit) {
		return false
	}
	sw.currCount++
	return true
}

// Count returns the approximate request count in the current window.
func (sw *SlidingWindow) Count() int {
	sw.mu.Lock()
	defer sw.mu.Unlock()
	sw.advance()
	return sw.currCount
}

// Limit returns the configured limit.
func (sw *SlidingWindow) Limit() int {
	return sw.limit
}

// WindowSize returns the window duration.
func (sw *SlidingWindow) WindowSize() time.Duration {
	return sw.windowSize
}

// Reset clears all counts.
func (sw *SlidingWindow) Reset() {
	sw.mu.Lock()
	defer sw.mu.Unlock()
	sw.prevCount = 0
	sw.currCount = 0
	sw.windowStart = time.Now()
}

// advance rotates windows if needed.
func (sw *SlidingWindow) advance() {
	now := time.Now()
	elapsed := now.Sub(sw.windowStart)
	if elapsed >= 2*sw.windowSize {
		sw.prevCount = 0
		sw.currCount = 0
		sw.windowStart = now
	} else if elapsed >= sw.windowSize {
		sw.prevCount = sw.currCount
		sw.currCount = 0
		sw.windowStart = now
	}
}

// FixedWindow implements a simple fixed window rate limiter.
type FixedWindow struct {
	mu          sync.Mutex
	limit       int
	windowSize  time.Duration
	count       int
	windowStart time.Time
}

// NewFixedWindow creates a fixed window rate limiter.
func NewFixedWindow(limit int, window time.Duration) *FixedWindow {
	return &FixedWindow{
		limit:       limit,
		windowSize:  window,
		windowStart: time.Now(),
	}
}

// Allow checks if a request is within the rate limit.
func (fw *FixedWindow) Allow() bool {
	fw.mu.Lock()
	defer fw.mu.Unlock()
	now := time.Now()
	if now.Sub(fw.windowStart) >= fw.windowSize {
		fw.count = 0
		fw.windowStart = now
	}
	if fw.count >= fw.limit {
		return false
	}
	fw.count++
	return true
}

// Count returns the current window's request count.
func (fw *FixedWindow) Count() int {
	fw.mu.Lock()
	defer fw.mu.Unlock()
	return fw.count
}

// Reset clears the current window.
func (fw *FixedWindow) Reset() {
	fw.mu.Lock()
	defer fw.mu.Unlock()
	fw.count = 0
	fw.windowStart = time.Now()
}
