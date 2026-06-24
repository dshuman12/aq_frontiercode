// Package sema implements a counting semaphore used to bound
// concurrency in batch importers.
package sema

import "sync"

// Semaphore is a counting semaphore.
type Semaphore struct {
	mu      sync.Mutex
	cond    *sync.Cond
	permits int64
}

// New returns a semaphore with the given initial permits.
func New(permits int64) *Semaphore {
	s := &Semaphore{permits: permits}
	s.cond = sync.NewCond(&s.mu)
	return s
}

// Acquire blocks until one permit is available, then consumes it.
func (s *Semaphore) Acquire() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for s.permits <= 0 {
		s.cond.Wait()
	}
	s.permits--
}

// TryAcquire returns true if a permit was available + consumed.
func (s *Semaphore) TryAcquire() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.permits <= 0 {
		return false
	}
	s.permits--
	return true
}

// Release returns one permit.
func (s *Semaphore) Release() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.permits++
	s.cond.Signal()
}

// Available returns the current permit count.
func (s *Semaphore) Available() int64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.permits
}
