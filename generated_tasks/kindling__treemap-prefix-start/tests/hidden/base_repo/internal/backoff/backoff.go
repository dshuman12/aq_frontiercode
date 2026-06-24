// Package backoff schedules retry delays with jitter.
package backoff

import (
	"math"
	"math/rand"
	"time"
)

// Schedule produces successive delays.
type Schedule interface {
	Next() time.Duration
	Reset()
}

// Constant returns d for every call.
type Constant struct {
	d time.Duration
}

// NewConstant returns a constant schedule.
func NewConstant(d time.Duration) *Constant { return &Constant{d: d} }

// Next returns the constant delay.
func (c *Constant) Next() time.Duration { return c.d }

// Reset is a no-op for constant schedules.
func (c *Constant) Reset() {}

// Exponential is exponential backoff with optional cap and jitter.
type Exponential struct {
	Initial time.Duration
	Factor  float64
	Cap     time.Duration
	Jitter  float64
	cur     time.Duration
	rand    *rand.Rand
}

// NewExponential builds an exponential schedule.
func NewExponential(initial time.Duration, factor float64, cap time.Duration, jitter float64) *Exponential {
	return &Exponential{
		Initial: initial,
		Factor:  factor,
		Cap:     cap,
		Jitter:  jitter,
		cur:     initial,
		rand:    rand.New(rand.NewSource(1)),
	}
}

// Next returns the next delay.
func (e *Exponential) Next() time.Duration {
	delay := e.cur
	e.cur = time.Duration(float64(e.cur) * e.Factor)
	if e.Cap > 0 && e.cur > e.Cap {
		e.cur = e.Cap
	}
	if e.Jitter > 0 {
		j := (e.rand.Float64()*2 - 1) * e.Jitter * float64(delay)
		delay += time.Duration(j)
	}
	if delay < 0 {
		delay = 0
	}
	return delay
}

// Reset re-arms the schedule.
func (e *Exponential) Reset() {
	e.cur = e.Initial
}

// FibonacciFn returns the n-th Fibonacci number, used by FibBackoff.
func FibonacciFn(n int) int {
	a, b := 0, 1
	for i := 0; i < n; i++ {
		a, b = b, a+b
	}
	return a
}

// FibBackoff is a Fibonacci-paced schedule (1, 1, 2, 3, 5, 8 ...).
type FibBackoff struct {
	Unit time.Duration
	Cap  time.Duration
	step int
}

// NewFib returns a Fibonacci-paced schedule.
func NewFib(unit, cap time.Duration) *FibBackoff {
	return &FibBackoff{Unit: unit, Cap: cap}
}

// Next returns the next delay.
func (f *FibBackoff) Next() time.Duration {
	f.step++
	d := time.Duration(FibonacciFn(f.step)) * f.Unit
	if f.Cap > 0 && d > f.Cap {
		return f.Cap
	}
	return d
}

// Reset re-arms the schedule.
func (f *FibBackoff) Reset() { f.step = 0 }

// Clamp limits d to [0, cap]; Cap of 0 means unlimited.
func Clamp(d, cap time.Duration) time.Duration {
	if d < 0 {
		return 0
	}
	if cap > 0 && d > cap {
		return cap
	}
	return d
}

// Average returns the average of every Next() call across n iterations.
func Average(s Schedule, n int) time.Duration {
	if n < 1 {
		return 0
	}
	var total int64
	for i := 0; i < n; i++ {
		total += int64(s.Next())
	}
	return time.Duration(math.Round(float64(total) / float64(n)))
}
