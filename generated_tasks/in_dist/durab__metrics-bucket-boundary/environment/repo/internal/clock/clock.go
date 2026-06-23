package clock

import "time"

type Clock interface {
	Now() time.Time
	Since(t time.Time) time.Duration
	NewTimer(d time.Duration) Timer
	Sleep(d time.Duration)
}

type Timer interface {
	C() <-chan time.Time
	Stop() bool
	Reset(d time.Duration) bool
}

type System struct{}

func (System) Now() time.Time                  { return time.Now() }
func (System) Since(t time.Time) time.Duration { return time.Since(t) }
func (System) Sleep(d time.Duration)           { time.Sleep(d) }

func (System) NewTimer(d time.Duration) Timer {
	return &sysTimer{t: time.NewTimer(d)}
}

type sysTimer struct{ t *time.Timer }

func (s *sysTimer) C() <-chan time.Time        { return s.t.C }
func (s *sysTimer) Stop() bool                 { return s.t.Stop() }
func (s *sysTimer) Reset(d time.Duration) bool { return s.t.Reset(d) }
