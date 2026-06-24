// Package asyncbatch buffers items keyed by string and flushes batches
// at a configured size or interval. Each key has its own buffer so a
// hot key cannot drown a quieter one's flush.
package asyncbatch

import (
	"context"
	"errors"
	"sync"
	"time"
)

// Flusher consumes one batch.
type Flusher func(key string, batch []any) error

// Config configures a Batcher.
type Config struct {
	Size     int
	Interval time.Duration
	Flush    Flusher
}

// Batcher batches items per key.
type Batcher struct {
	cfg     Config
	mu      sync.Mutex
	pending map[string][]any
	last    map[string]time.Time
	now     func() time.Time
	stopped bool
}

// New constructs a Batcher.
func New(cfg Config) *Batcher {
	if cfg.Size <= 0 {
		cfg.Size = 64
	}
	if cfg.Interval == 0 {
		cfg.Interval = time.Second
	}
	return &Batcher{
		cfg:     cfg,
		pending: map[string][]any{},
		last:    map[string]time.Time{},
		now:     time.Now,
	}
}

// SetClock overrides the time source.
func (b *Batcher) SetClock(fn func() time.Time) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.now = fn
}

// Submit adds value to the batch for key.
func (b *Batcher) Submit(key string, value any) error {
	b.mu.Lock()
	if b.stopped {
		b.mu.Unlock()
		return errors.New("asyncbatch: stopped")
	}
	now := b.now()
	if _, ok := b.last[key]; !ok {
		b.last[key] = now
	}
	b.pending[key] = append(b.pending[key], value)
	if len(b.pending[key]) <= b.cfg.Size {
		b.mu.Unlock()
		return nil
	}
	batch := b.pending[key]
	delete(b.pending, key)
	delete(b.last, key)
	b.mu.Unlock()
	return b.cfg.Flush(key, batch)
}

// Tick flushes any batch whose age exceeds the interval.
func (b *Batcher) Tick() error {
	b.mu.Lock()
	now := b.now()
	type item struct {
		key   string
		batch []any
	}
	var due []item
	for k, t := range b.last {
		if now.Sub(t) >= b.cfg.Interval {
			due = append(due, item{key: k, batch: b.pending[k]})
			delete(b.pending, k)
			delete(b.last, k)
		}
	}
	b.mu.Unlock()
	for _, it := range due {
		if err := b.cfg.Flush(it.key, it.batch); err != nil {
			return err
		}
	}
	return nil
}

// Run drives Tick until ctx cancels.
func (b *Batcher) Run(ctx context.Context, tickEvery time.Duration) {
	t := time.NewTicker(tickEvery)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			_ = b.Tick()
		}
	}
}

// Flush forces every pending batch to flush.
func (b *Batcher) Flush() error {
	b.mu.Lock()
	type item struct {
		key   string
		batch []any
	}
	var all []item
	for k, batch := range b.pending {
		all = append(all, item{key: k, batch: batch})
		delete(b.pending, k)
		delete(b.last, k)
	}
	b.mu.Unlock()
	for _, it := range all {
		if err := b.cfg.Flush(it.key, it.batch); err != nil {
			return err
		}
	}
	return nil
}

// Stop marks the batcher as stopped after a final flush.
func (b *Batcher) Stop() error {
	if err := b.Flush(); err != nil {
		return err
	}
	b.mu.Lock()
	b.stopped = true
	b.mu.Unlock()
	return nil
}

// Pending returns the number of in-flight items.
func (b *Batcher) Pending() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	n := 0
	for _, batch := range b.pending {
		n += len(batch)
	}
	return n
}
