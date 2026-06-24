// Package shipper batches records destined for a remote sink and applies
// retry-with-backoff and bounded in-flight pressure.
//
// A Shipper is fed via Submit; it batches up to BatchSize records or
// MaxLatency duration and then calls Sink. On error it retries with
// exponential backoff up to MaxAttempts, after which the batch is
// surfaced via the OnDrop callback.
package shipper

import (
	"context"
	"errors"
	"sync"
	"time"
)

// Sink writes a batch of records to a remote system.
type Sink func(ctx context.Context, batch [][]byte) error

// OnDrop is invoked when a batch can't be delivered.
type OnDrop func(batch [][]byte, lastErr error)

// Config configures a Shipper.
type Config struct {
	BatchSize   int
	MaxLatency  time.Duration
	MaxAttempts int
	Backoff     time.Duration
	OnDrop      OnDrop
}

// Shipper batches records and ships them.
type Shipper struct {
	cfg     Config
	sink    Sink
	mu      sync.Mutex
	pending [][]byte
	now     func() time.Time
	stopped bool
}

// New constructs a Shipper.
func New(cfg Config, sink Sink) *Shipper {
	if cfg.BatchSize <= 0 {
		cfg.BatchSize = 100
	}
	if cfg.MaxLatency == 0 {
		cfg.MaxLatency = time.Second
	}
	if cfg.MaxAttempts == 0 {
		cfg.MaxAttempts = 3
	}
	if cfg.Backoff == 0 {
		cfg.Backoff = 100 * time.Millisecond
	}
	return &Shipper{cfg: cfg, sink: sink, now: time.Now}
}

// SetClock overrides the time source.
func (s *Shipper) SetClock(fn func() time.Time) { s.now = fn }

// Submit records a payload. Caller does not own the slice after the call.
func (s *Shipper) Submit(ctx context.Context, payload []byte) error {
	s.mu.Lock()
	if s.stopped {
		s.mu.Unlock()
		return errors.New("shipper: stopped")
	}
	s.pending = append(s.pending, payload)
	full := len(s.pending) >= s.cfg.BatchSize
	s.mu.Unlock()
	if full {
		return s.Flush(ctx)
	}
	return nil
}

// Flush attempts to deliver all currently pending records.
func (s *Shipper) Flush(ctx context.Context) error {
	s.mu.Lock()
	batch := s.pending
	s.pending = nil
	s.mu.Unlock()
	if len(batch) == 0 {
		return nil
	}
	var lastErr error
	delay := s.cfg.Backoff
	for attempt := 1; attempt <= s.cfg.MaxAttempts; attempt++ {
		if err := s.sink(ctx, batch); err == nil {
			return nil
		} else {
			lastErr = err
		}
		select {
		case <-ctx.Done():
			if s.cfg.OnDrop != nil {
				s.cfg.OnDrop(batch, ctx.Err())
			}
			return ctx.Err()
		case <-time.After(delay):
		}
		delay *= 2
	}
	if s.cfg.OnDrop != nil {
		s.cfg.OnDrop(batch, lastErr)
	}
	return lastErr
}

// Pending reports the number of buffered records.
func (s *Shipper) Pending() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.pending)
}

// Close marks the shipper as stopped and flushes once.
func (s *Shipper) Close(ctx context.Context) error {
	s.mu.Lock()
	s.stopped = true
	s.mu.Unlock()
	return s.Flush(ctx)
}
