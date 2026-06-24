// Package retry provides linear and exponential backoff helpers for
// I/O operations that can fail intermittently.
package retry

import (
	"context"
	"errors"
	"time"
)

// Linear retries fn up to attempts times, sleeping delay between failures.
type Linear struct {
	Attempts int
	Delay    time.Duration
}

// Default5x100ms is the conventional default schedule.
func Default5x100ms() Linear {
	return Linear{Attempts: 5, Delay: 100 * time.Millisecond}
}

// Run invokes fn until it succeeds, the attempt cap is hit, or ctx is done.
func (l Linear) Run(ctx context.Context, fn func() error) error {
	if l.Attempts < 1 {
		l.Attempts = 1
	}
	var last error
	for i := 0; i < l.Attempts; i++ {
		if err := fn(); err == nil {
			return nil
		} else {
			last = err
		}
		if i+1 < l.Attempts {
			select {
			case <-ctx.Done():
				return errors.Join(last, ctx.Err())
			case <-time.After(l.Delay):
			}
		}
	}
	return last
}

// Exponential is exponential backoff with a cap.
type Exponential struct {
	Attempts int
	Initial  time.Duration
	Factor   int
	Cap      time.Duration
}

// DelayFor computes the delay for attempt i (0-indexed).
func (e Exponential) DelayFor(i int) time.Duration {
	if e.Initial <= 0 {
		return 0
	}
	d := e.Initial
	for k := 0; k < i; k++ {
		d *= time.Duration(e.Factor)
		if e.Cap > 0 && d > e.Cap {
			return e.Cap
		}
	}
	if e.Cap > 0 && d > e.Cap {
		return e.Cap
	}
	return d
}

// Run invokes fn with exponential backoff.
func (e Exponential) Run(ctx context.Context, fn func() error) error {
	if e.Attempts < 1 {
		e.Attempts = 1
	}
	if e.Factor < 1 {
		e.Factor = 2
	}
	var last error
	for i := 0; i < e.Attempts; i++ {
		if err := fn(); err == nil {
			return nil
		} else {
			last = err
		}
		if i+1 < e.Attempts {
			select {
			case <-ctx.Done():
				return errors.Join(last, ctx.Err())
			case <-time.After(e.DelayFor(i)):
			}
		}
	}
	return last
}
