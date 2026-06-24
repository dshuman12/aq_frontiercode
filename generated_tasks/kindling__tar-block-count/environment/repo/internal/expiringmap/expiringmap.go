// Package expiringmap is a key/value map whose entries automatically
// expire after a TTL. Internally it pairs a hash map with a min-heap of
// expiry deadlines so removing the oldest entry is O(log n).
package expiringmap

import (
	"container/heap"
	"sync"
	"time"
)

// Entry is one key/value with an expiry deadline.
type Entry struct {
	Key       string
	Value     any
	ExpiresAt time.Time
	index     int
}

type entryHeap []*Entry

func (h entryHeap) Len() int           { return len(h) }
func (h entryHeap) Less(i, j int) bool { return h[i].ExpiresAt.Before(h[j].ExpiresAt) }
func (h entryHeap) Swap(i, j int) {
	h[i], h[j] = h[j], h[i]
	h[i].index = i
	h[j].index = j
}
func (h *entryHeap) Push(x any) {
	e := x.(*Entry)
	e.index = len(*h)
	*h = append(*h, e)
}
func (h *entryHeap) Pop() any {
	old := *h
	n := len(old)
	e := old[n-1]
	e.index = -1
	*h = old[:n-1]
	return e
}

// Map is the expiring map.
type Map struct {
	mu   sync.Mutex
	by   map[string]*Entry
	heap entryHeap
	now  func() time.Time
}

// New constructs a Map.
func New() *Map {
	return &Map{by: map[string]*Entry{}, now: time.Now}
}

// SetClock overrides the time source.
func (m *Map) SetClock(fn func() time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.now = fn
}

// Set inserts or updates key with the given TTL.
func (m *Map) Set(key string, value any, ttl time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	expires := m.now().Add(ttl)
	if e, ok := m.by[key]; ok {
		e.Value = value
		e.ExpiresAt = expires
		heap.Fix(&m.heap, e.index)
		return
	}
	e := &Entry{Key: key, Value: value, ExpiresAt: expires}
	heap.Push(&m.heap, e)
	m.by[key] = e
}

// Get returns the value if not expired.
func (m *Map) Get(key string) (any, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sweepLocked()
	e, ok := m.by[key]
	if !ok {
		return nil, false
	}
	return e.Value, true
}

// Delete removes key.
func (m *Map) Delete(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if e, ok := m.by[key]; ok {
		if e.index >= 0 {
			heap.Remove(&m.heap, e.index)
		}
		delete(m.by, key)
	}
}

// Len returns the number of live entries.
func (m *Map) Len() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sweepLocked()
	return len(m.by)
}

// NextExpiry returns the soonest expiry time and whether any entries remain.
func (m *Map) NextExpiry() (time.Time, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.heap.Len() == 0 {
		return time.Time{}, false
	}
	return m.heap[0].ExpiresAt, true
}

// Sweep removes all expired entries; returns the number swept.
func (m *Map) Sweep() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.sweepLocked()
}

func (m *Map) sweepLocked() int {
	now := m.now()
	n := 0
	for m.heap.Len() > 0 {
		top := m.heap[0]
		if top.ExpiresAt.After(now) {
			break
		}
		heap.Pop(&m.heap)
		delete(m.by, top.Key)
		n++
	}
	return n
}
