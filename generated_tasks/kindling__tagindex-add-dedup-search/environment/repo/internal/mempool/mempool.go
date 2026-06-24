// Package mempool wraps sync.Pool with type-safe accessors and a
// counter so operators can monitor allocation churn.
package mempool

import (
	"sync"
	"sync/atomic"
)

// Pool is a typed memory pool.
type Pool[T any] struct {
	pool      sync.Pool
	gets, puts uint64
	misses    uint64
}

// New constructs a pool whose factory builds new T instances.
func New[T any](factory func() *T) *Pool[T] {
	p := &Pool[T]{}
	p.pool.New = func() any {
		atomic.AddUint64(&p.misses, 1)
		return factory()
	}
	return p
}

// Get returns a pooled or freshly allocated instance.
func (p *Pool[T]) Get() *T {
	atomic.AddUint64(&p.gets, 1)
	return p.pool.Get().(*T)
}

// Put returns v to the pool.
func (p *Pool[T]) Put(v *T) {
	atomic.AddUint64(&p.puts, 1)
	p.pool.Put(v)
}

// Stats returns counters since pool creation.
type Stats struct {
	Gets, Puts, Misses uint64
}

// Stats returns a snapshot of the counters.
func (p *Pool[T]) Stats() Stats {
	return Stats{
		Gets:   atomic.LoadUint64(&p.gets),
		Puts:   atomic.LoadUint64(&p.puts),
		Misses: atomic.LoadUint64(&p.misses),
	}
}

// HitRate returns the fraction of Gets satisfied without allocation.
func (p *Pool[T]) HitRate() float64 {
	s := p.Stats()
	if s.Gets == 0 {
		return 0
	}
	if s.Misses > s.Gets {
		return 0
	}
	return 1 - float64(s.Misses)/float64(s.Gets)
}
