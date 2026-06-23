package clock

import (
	"sort"
	"sync"
	"time"
)

// Fake is a Clock whose time is set explicitly. It is the only Clock allowed
// inside replay; production code must not import it for non-test purposes.
type Fake struct {
	mu     sync.Mutex
	now    time.Time
	timers []*fakeTimer
}

// NewFake returns a Fake clock anchored at now.
func NewFake(now time.Time) *Fake { return &Fake{now: now} }

func (f *Fake) Now() time.Time                 { f.mu.Lock(); defer f.mu.Unlock(); return f.now }
func (f *Fake) Since(t time.Time) time.Duration { return f.Now().Sub(t) }
func (f *Fake) Sleep(d time.Duration)           { f.Advance(d) }

func (f *Fake) NewTimer(d time.Duration) Timer {
	f.mu.Lock()
	defer f.mu.Unlock()
	t := &fakeTimer{
		f:    f,
		when: f.now.Add(d),
		ch:   make(chan time.Time, 1),
	}
	f.timers = append(f.timers, t)
	return t
}

// Advance moves the clock forward by d, firing any timers whose deadline is
// reached. Firing order is by deadline ascending; ties are resolved by
// creation order.
func (f *Fake) Advance(d time.Duration) {
	f.mu.Lock()
	f.now = f.now.Add(d)
	due := make([]*fakeTimer, 0, len(f.timers))
	rest := f.timers[:0]
	for _, t := range f.timers {
		if !t.when.After(f.now) && !t.fired && !t.stopped {
			due = append(due, t)
		} else {
			rest = append(rest, t)
		}
	}
	f.timers = rest
	sort.SliceStable(due, func(i, j int) bool { return due[i].when.Before(due[j].when) })
	now := f.now
	f.mu.Unlock()
	for _, t := range due {
		t.fire(now)
	}
}

type fakeTimer struct {
	f      *Fake
	when   time.Time
	ch     chan time.Time
	fired  bool
	stopped bool
}

func (t *fakeTimer) C() <-chan time.Time { return t.ch }

func (t *fakeTimer) Stop() bool {
	t.f.mu.Lock()
	defer t.f.mu.Unlock()
	if t.fired || t.stopped {
		return false
	}
	t.stopped = true
	return true
}

func (t *fakeTimer) Reset(d time.Duration) bool {
	t.f.mu.Lock()
	defer t.f.mu.Unlock()
	active := !t.fired && !t.stopped
	t.when = t.f.now.Add(d)
	t.fired = false
	t.stopped = false
	return active
}

func (t *fakeTimer) fire(at time.Time) {
	t.fired = true
	select {
	case t.ch <- at:
	default:
	}
}
