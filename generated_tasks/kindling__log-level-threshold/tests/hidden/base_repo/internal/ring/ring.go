// Package ring implements a fixed-capacity ring buffer used by the
// log streamer to retain the last N records in memory.
package ring

import "sync"

// Buffer is a thread-safe ring buffer of arbitrary values.
type Buffer struct {
	mu     sync.Mutex
	items  []any
	head   int
	length int
}

// New builds a ring with the given capacity (>= 1).
func New(capacity int) *Buffer {
	if capacity < 1 {
		capacity = 1
	}
	return &Buffer{items: make([]any, capacity)}
}

// Capacity returns the fixed capacity.
func (b *Buffer) Capacity() int {
	return len(b.items)
}

// Len returns the current number of stored items.
func (b *Buffer) Len() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.length
}

// Push appends v, overwriting the oldest entry when full.
func (b *Buffer) Push(v any) {
	b.mu.Lock()
	defer b.mu.Unlock()
	idx := (b.head + b.length) % len(b.items)
	if b.length == len(b.items) {
		b.head = (b.head + 1) % len(b.items)
	} else {
		b.length++
	}
	b.items[idx] = v
}

// Snapshot returns a copy of the entries oldest-first.
func (b *Buffer) Snapshot() []any {
	b.mu.Lock()
	defer b.mu.Unlock()
	out := make([]any, b.length)
	for i := 0; i < b.length; i++ {
		out[i] = b.items[(b.head+i)%len(b.items)]
	}
	return out
}

// Reset clears every entry.
func (b *Buffer) Reset() {
	b.mu.Lock()
	defer b.mu.Unlock()
	for i := range b.items {
		b.items[i] = nil
	}
	b.head = 0
	b.length = 0
}
