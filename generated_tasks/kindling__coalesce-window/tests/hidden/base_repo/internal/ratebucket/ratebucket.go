// Package ratebucket implements a sliding-window rate counter, suitable
// for "requests per minute" style measurements without keeping every
// individual sample.
//
// The window is divided into a fixed number of buckets; each Tick rolls
// off the oldest bucket and starts a new one. Counts are reported as
// the sum across all buckets currently inside the window.
package ratebucket

import (
	"sync"
	"time"
)

// Counter is a sliding-window counter.
type Counter struct {
	mu        sync.Mutex
	window    time.Duration
	bucketDur time.Duration
	buckets   []bucket
	now       func() time.Time
	head      int
}

type bucket struct {
	start time.Time
	count uint64
}

// New constructs a Counter spanning window with bucketCount buckets.
func New(window time.Duration, bucketCount int) *Counter {
	if bucketCount < 2 {
		bucketCount = 60
	}
	c := &Counter{
		window:    window,
		bucketDur: window / time.Duration(bucketCount),
		buckets:   make([]bucket, bucketCount),
		now:       time.Now,
	}
	now := time.Now()
	for i := range c.buckets {
		c.buckets[i].start = now.Add(-c.bucketDur * time.Duration(bucketCount-i))
	}
	return c
}

// SetClock overrides the time source.
func (c *Counter) SetClock(fn func() time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.now = fn
}

// Add increments the current bucket by n.
func (c *Counter) Add(n uint64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.advanceLocked()
	c.buckets[c.head].count += n
}

// Sum returns the total count over the window.
func (c *Counter) Sum() uint64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.advanceLocked()
	var total uint64
	for _, b := range c.buckets {
		total += b.count
	}
	return total
}

// Rate returns Sum / window in events per second.
func (c *Counter) Rate() float64 {
	return float64(c.Sum()) / c.window.Seconds()
}

func (c *Counter) advanceLocked() {
	now := c.now()
	for {
		head := c.buckets[c.head]
		if now.Before(head.start.Add(c.bucketDur)) {
			return
		}
		c.head = (c.head + 1) % len(c.buckets)
		c.buckets[c.head] = bucket{start: head.start.Add(c.bucketDur)}
	}
}
