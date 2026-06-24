// Package watchdog implements a deadman switch: a goroutine fires the
// configured callback if Heartbeat isn't called within the timeout. It
// is used to detect when a long-lived consumer is wedged.
package watchdog

import (
	"context"
	"sync"
	"sync/atomic"
	"time"
)

// Watchdog tracks heartbeat liveness.
type Watchdog struct {
	timeout time.Duration
	last    atomic.Int64
	onStall func()
	now     func() time.Time
	stopped chan struct{}
	once    sync.Once
}

// New constructs a Watchdog.
func New(timeout time.Duration, onStall func()) *Watchdog {
	w := &Watchdog{
		timeout: timeout,
		onStall: onStall,
		now:     time.Now,
		stopped: make(chan struct{}),
	}
	w.last.Store(time.Now().UnixNano())
	return w
}

// SetClock overrides the time source.
func (w *Watchdog) SetClock(fn func() time.Time) { w.now = fn }

// Heartbeat updates the last-seen timestamp.
func (w *Watchdog) Heartbeat() {
	w.last.Store(w.now().UnixNano())
}

// LastHeartbeat returns the most recent heartbeat time.
func (w *Watchdog) LastHeartbeat() time.Time {
	return time.Unix(0, w.last.Load())
}

// Run drives the watchdog loop until ctx cancels.
func (w *Watchdog) Run(ctx context.Context, tick time.Duration) {
	t := time.NewTicker(tick)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-w.stopped:
			return
		case <-t.C:
			w.checkLocked()
		}
	}
}

func (w *Watchdog) checkLocked() {
	last := w.LastHeartbeat()
	if w.now().Sub(last) > w.timeout {
		if w.onStall != nil {
			w.onStall()
		}
	}
}

// Stop signals Run to exit.
func (w *Watchdog) Stop() {
	w.once.Do(func() { close(w.stopped) })
}

// Healthy reports whether the most recent heartbeat is within timeout.
func (w *Watchdog) Healthy() bool {
	return w.now().Sub(w.LastHeartbeat()) <= w.timeout
}
