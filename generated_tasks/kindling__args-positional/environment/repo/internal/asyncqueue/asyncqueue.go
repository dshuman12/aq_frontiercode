// Package asyncqueue implements a bounded multi-producer / multi-consumer
// queue with optional drop-oldest semantics.
//
// Compared to a raw buffered channel the asyncqueue:
//
//   - Reports the high-water mark.
//   - Returns ErrFull when full and drop-oldest is disabled.
//   - Lets consumers drain in batches.
package asyncqueue

import (
	"context"
	"errors"
	"sync"
)

// ErrFull is returned when Submit can't enqueue and DropOldest is off.
var ErrFull = errors.New("asyncqueue: full")

// Queue is the bounded queue.
type Queue[T any] struct {
	mu        sync.Mutex
	notEmpty  *sync.Cond
	items     []T
	max       int
	dropOldest bool
	highWater int
	dropped   int
	closed    bool
}

// Options configures Queue.
type Options struct {
	Max        int
	DropOldest bool
}

// New constructs a Queue.
func New[T any](opt Options) *Queue[T] {
	if opt.Max <= 0 {
		opt.Max = 1024
	}
	q := &Queue[T]{max: opt.Max, dropOldest: opt.DropOldest}
	q.notEmpty = sync.NewCond(&q.mu)
	return q
}

// Submit enqueues v. Returns ErrFull if the queue is full and
// DropOldest is disabled.
func (q *Queue[T]) Submit(v T) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.closed {
		return errors.New("asyncqueue: closed")
	}
	if len(q.items) >= q.max {
		if !q.dropOldest {
			return ErrFull
		}
		q.items = q.items[1:]
		q.dropped++
	}
	q.items = append(q.items, v)
	if len(q.items) > q.highWater {
		q.highWater = len(q.items)
	}
	q.notEmpty.Signal()
	return nil
}

// Take blocks until an item is available or ctx is cancelled.
func (q *Queue[T]) Take(ctx context.Context) (T, error) {
	var zero T
	done := make(chan struct{})
	stopCtx := func() {
		select {
		case <-done:
		case <-ctx.Done():
			q.mu.Lock()
			q.notEmpty.Broadcast()
			q.mu.Unlock()
		}
	}
	go stopCtx()
	defer close(done)

	q.mu.Lock()
	defer q.mu.Unlock()
	for len(q.items) == 0 && !q.closed && ctx.Err() == nil {
		q.notEmpty.Wait()
	}
	if ctx.Err() != nil {
		return zero, ctx.Err()
	}
	if len(q.items) == 0 {
		return zero, errors.New("asyncqueue: closed")
	}
	v := q.items[0]
	q.items = q.items[1:]
	return v, nil
}

// Drain returns up to n items immediately without blocking.
func (q *Queue[T]) Drain(n int) []T {
	q.mu.Lock()
	defer q.mu.Unlock()
	if n <= 0 || len(q.items) == 0 {
		return nil
	}
	if n > len(q.items) {
		n = len(q.items)
	}
	out := make([]T, n)
	copy(out, q.items[:n])
	q.items = q.items[n:]
	return out
}

// Len returns the current item count.
func (q *Queue[T]) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.items)
}

// HighWater returns the maximum size observed since construction.
func (q *Queue[T]) HighWater() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.highWater
}

// Dropped returns the number of items dropped due to back-pressure.
func (q *Queue[T]) Dropped() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.dropped
}

// Close prevents further submits and unblocks waiting Takes.
func (q *Queue[T]) Close() {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.closed = true
	q.notEmpty.Broadcast()
}
