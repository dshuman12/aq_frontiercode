package main

// RingBuffer is a fixed-capacity circular buffer. When full, the oldest entry is evicted.
// All operations assume the caller holds the appropriate lock (e.g., BCOEngine.mu).
type RingBuffer[T any] struct {
	buf   []T
	cap   int
	head  int // next write position
	count int
}

// NewRingBuffer creates a ring buffer with the given capacity.
func NewRingBuffer[T any](capacity int) *RingBuffer[T] {
	return &RingBuffer[T]{
		buf: make([]T, capacity),
		cap: capacity,
	}
}

// Add appends an entry, evicting the oldest if at capacity.
func (r *RingBuffer[T]) Add(entry T) {
	r.buf[r.head] = entry
	r.head = (r.head + 1) % r.cap
	if r.count < r.cap {
		r.count++
	}
}

// Entries returns all entries newest-first.
func (r *RingBuffer[T]) Entries() []T {
	if r.count == 0 {
		return nil
	}
	out := make([]T, r.count)
	for i := 0; i < r.count; i++ {
		idx := (r.head - 1 - i + r.cap) % r.cap
		out[i] = r.buf[idx]
	}
	return out
}

// EntriesLimited returns at most maxEntries entries, newest-first.
// If maxEntries <= 0 or >= count, returns all entries.
func (r *RingBuffer[T]) EntriesLimited(maxEntries int) []T {
	if maxEntries <= 0 || maxEntries >= r.count {
		return r.Entries()
	}
	out := make([]T, maxEntries)
	for i := 0; i < maxEntries; i++ {
		idx := (r.head - 1 - i + r.cap) % r.cap
		out[i] = r.buf[idx]
	}
	return out
}

// RemoveLastWhere removes the most recent entry satisfying pred and returns true,
// or returns false if no match. Caller must hold the appropriate lock.
func (r *RingBuffer[T]) RemoveLastWhere(pred func(T) bool) bool {
	for i := 0; i < r.count; i++ {
		idx := (r.head - 1 - i + r.cap) % r.cap
		if pred(r.buf[idx]) {
			for j := i; j > 0; j-- {
				src := (r.head - 1 - j + r.cap) % r.cap
				dst := (r.head - j + r.cap) % r.cap
				r.buf[dst] = r.buf[src]
			}
			r.head = (r.head - 1 + r.cap) % r.cap
			r.count--
			var zero T
			r.buf[r.head] = zero
			return true
		}
	}
	return false
}

// Len returns the number of entries in the buffer.
func (r *RingBuffer[T]) Len() int {
	return r.count
}
