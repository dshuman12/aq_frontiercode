// Package clock abstracts wall time so workers, schedulers and tests can be
// driven deterministically. The engine NEVER calls time.Now directly; it
// always goes through a Clock so that history replay sees the same values as
// the original run.
package clock

import "time"

// Clock is the minimum interface needed by the engine. Implementations must
// be safe for concurrent use.
type Clock interface {
	Now() time.Time
	Since(t time.Time) time.Duration
	NewTimer(d time.Duration) Timer
	Sleep(d time.Duration)
}

// Timer mirrors *time.Timer but is interface-shaped so a fake clock can
// drive it.
type Timer interface {
	C() <-chan time.Time
	Stop() bool
	Reset(d time.Duration) bool
}

// System is the real wall clock.
type System struct{}

func (System) Now() time.Time                 { return time.Now() }
func (System) Since(t time.Time) time.Duration { return time.Since(t) }
func (System) Sleep(d time.Duration)           { time.Sleep(d) }

func (System) NewTimer(d time.Duration) Timer {
	return &sysTimer{t: time.NewTimer(d)}
}

type sysTimer struct{ t *time.Timer }

func (s *sysTimer) C() <-chan time.Time     { return s.t.C }
func (s *sysTimer) Stop() bool              { return s.t.Stop() }
func (s *sysTimer) Reset(d time.Duration) bool { return s.t.Reset(d) }
