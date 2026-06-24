// Package coalesce buffers near-duplicate log records, emitting one
// summary record once a quiet window has elapsed.
//
// Logs from a single noisy producer often arrive as bursts of identical
// messages. The coalescer waits for windowDur of silence on a given key
// then flushes a summary record carrying the count and first/last
// observed times.
package coalesce

import (
	"sync"
	"time"
)

// Summary is what an emitter receives per coalesced key.
type Summary struct {
	Key   string
	Count int
	First time.Time
	Last  time.Time
	Tail  any // last value seen on this key
}

// Emitter is invoked once a window closes.
type Emitter func(Summary)

// Coalescer batches values keyed by string.
type Coalescer struct {
	window  time.Duration
	emitter Emitter
	now     func() time.Time
	mu      sync.Mutex
	pending map[string]*Summary
}

// New constructs a Coalescer.
func New(window time.Duration, emitter Emitter) *Coalescer {
	return &Coalescer{
		window:  window,
		emitter: emitter,
		now:     time.Now,
		pending: map[string]*Summary{},
	}
}

// SetClock overrides the time source (tests).
func (c *Coalescer) SetClock(fn func() time.Time) { c.now = fn }

// Add records key/value.
func (c *Coalescer) Add(key string, value any) {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := c.now()
	s, ok := c.pending[key]
	if !ok {
		c.pending[key] = &Summary{Key: key, Count: 1, First: now, Last: now, Tail: value}
		return
	}
	s.Count++
	s.Last = now
	s.Tail = value
}

// Tick flushes any keys whose last observation is older than window.
func (c *Coalescer) Tick() int {
	c.mu.Lock()
	now := c.now()
	flushed := []*Summary{}
	for k, s := range c.pending {
		if now.Sub(s.Last) >= c.window {
			flushed = append(flushed, s)
			delete(c.pending, k)
		}
	}
	c.mu.Unlock()
	for _, s := range flushed {
		c.emitter(*s)
	}
	return len(flushed)
}

// Flush emits all pending summaries unconditionally.
func (c *Coalescer) Flush() int {
	c.mu.Lock()
	flushed := make([]*Summary, 0, len(c.pending))
	for k, s := range c.pending {
		flushed = append(flushed, s)
		delete(c.pending, k)
	}
	c.mu.Unlock()
	for _, s := range flushed {
		c.emitter(*s)
	}
	return len(flushed)
}

// Pending returns the number of in-flight keys.
func (c *Coalescer) Pending() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.pending)
}
