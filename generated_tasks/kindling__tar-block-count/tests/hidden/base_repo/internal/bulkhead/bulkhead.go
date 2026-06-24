// Package bulkhead implements a bounded-concurrency limiter inspired by
// the Hystrix bulkhead pattern. Submitting work past the cap returns
// ErrFull immediately rather than blocking, so callers can degrade
// gracefully under load.
package bulkhead

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
)

// ErrFull is returned by Submit when no slot is available.
var ErrFull = errors.New("bulkhead: full")

// Bulkhead caps concurrent in-flight calls.
type Bulkhead struct {
	cap      int
	sem      chan struct{}
	mu       sync.Mutex
	inflight int
	rejected uint64
	served   uint64
}

// New constructs a Bulkhead.
func New(cap int) *Bulkhead {
	if cap <= 0 {
		cap = 1
	}
	return &Bulkhead{cap: cap, sem: make(chan struct{}, cap)}
}

// Submit runs fn if a slot is available.
func (b *Bulkhead) Submit(fn func() error) error {
	select {
	case b.sem <- struct{}{}:
		b.mu.Lock()
		b.inflight++
		b.mu.Unlock()
		err := fn()
		<-b.sem
		b.mu.Lock()
		b.inflight--
		b.mu.Unlock()
		atomic.AddUint64(&b.served, 1)
		return err
	default:
		atomic.AddUint64(&b.rejected, 1)
		return ErrFull
	}
}

// SubmitContext blocks until a slot opens or ctx cancels.
func (b *Bulkhead) SubmitContext(ctx context.Context, fn func() error) error {
	select {
	case b.sem <- struct{}{}:
	case <-ctx.Done():
		return ctx.Err()
	}
	b.mu.Lock()
	b.inflight++
	b.mu.Unlock()
	err := fn()
	<-b.sem
	b.mu.Lock()
	b.inflight--
	b.mu.Unlock()
	atomic.AddUint64(&b.served, 1)
	return err
}

// Inflight reports the current in-flight count.
func (b *Bulkhead) Inflight() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.inflight
}

// Stats summarises counters.
type Stats struct {
	Cap, Inflight    int
	Served, Rejected uint64
}

// Stats returns a snapshot.
func (b *Bulkhead) Stats() Stats {
	b.mu.Lock()
	defer b.mu.Unlock()
	return Stats{
		Cap:      b.cap,
		Inflight: b.inflight,
		Served:   atomic.LoadUint64(&b.served),
		Rejected: atomic.LoadUint64(&b.rejected),
	}
}
