// Package reactor implements a small single-threaded event loop with a
// priority queue of timers and a non-blocking input channel. It backs
// the watchdog and graceful-shutdown coordinator inside kindling.
package reactor

import (
	"container/heap"
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"time"
)

// Handler runs in response to a delivered event.
type Handler func(ctx context.Context, ev Event) error

// Event is one queueable unit of work.
type Event struct {
	Kind    string
	Payload any
}

// Reactor dispatches events.
type Reactor struct {
	mu       sync.Mutex
	handlers map[string]Handler
	timers   timerQueue
	inbox    chan Event
	stopped  atomic.Bool
	wg       sync.WaitGroup
}

// New constructs a Reactor with the given inbox capacity.
func New(inboxCap int) *Reactor {
	if inboxCap <= 0 {
		inboxCap = 64
	}
	return &Reactor{
		handlers: map[string]Handler{},
		inbox:    make(chan Event, inboxCap),
	}
}

// On registers a handler for kind.
func (r *Reactor) On(kind string, h Handler) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.handlers[kind] = h
}

// Submit queues ev. Returns ErrClosed when the reactor has stopped.
func (r *Reactor) Submit(ev Event) error {
	if r.stopped.Load() {
		return ErrClosed
	}
	r.inbox <- ev
	return nil
}

// ErrClosed is returned by Submit after Stop.
var ErrClosed = errors.New("reactor: closed")

// AfterFunc schedules ev to fire after d. Cancelling the returned cancel
// function before d removes the timer.
func (r *Reactor) AfterFunc(d time.Duration, ev Event) (cancel func()) {
	when := time.Now().Add(d)
	t := &timerItem{when: when, ev: ev}
	r.mu.Lock()
	heap.Push(&r.timers, t)
	r.mu.Unlock()
	cancelled := false
	return func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		if cancelled || t.index < 0 {
			return
		}
		cancelled = true
		heap.Remove(&r.timers, t.index)
	}
}

// Run drives the loop until ctx is cancelled.
func (r *Reactor) Run(ctx context.Context) error {
	r.wg.Add(1)
	defer r.wg.Done()
	for {
		next := r.nextTimer()
		var timerCh <-chan time.Time
		if next != nil {
			d := time.Until(next.when)
			if d < 0 {
				d = 0
			}
			t := time.NewTimer(d)
			timerCh = t.C
		}
		select {
		case <-ctx.Done():
			r.stopped.Store(true)
			return ctx.Err()
		case ev, ok := <-r.inbox:
			if !ok {
				return nil
			}
			r.dispatch(ctx, ev)
		case <-timerCh:
			r.fireTimers(ctx)
		}
	}
}

func (r *Reactor) nextTimer() *timerItem {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.timers.Len() == 0 {
		return nil
	}
	return r.timers[0]
}

func (r *Reactor) fireTimers(ctx context.Context) {
	now := time.Now()
	r.mu.Lock()
	var due []*timerItem
	for r.timers.Len() > 0 {
		t := r.timers[0]
		if t.when.After(now) {
			break
		}
		heap.Pop(&r.timers)
		due = append(due, t)
	}
	r.mu.Unlock()
	for _, t := range due {
		r.dispatch(ctx, t.ev)
	}
}

func (r *Reactor) dispatch(ctx context.Context, ev Event) {
	r.mu.Lock()
	h, ok := r.handlers[ev.Kind]
	r.mu.Unlock()
	if !ok {
		return
	}
	_ = h(ctx, ev)
}

// Stop signals the loop to drain and exit.
func (r *Reactor) Stop() {
	r.stopped.Store(true)
	close(r.inbox)
	r.wg.Wait()
}

// timerItem is one timer in the heap.
type timerItem struct {
	when  time.Time
	ev    Event
	index int
}

// timerQueue implements heap.Interface ordered by when ascending.
type timerQueue []*timerItem

func (q timerQueue) Len() int { return len(q) }
func (q timerQueue) Less(i, j int) bool {
	return q[i].when.Before(q[j].when)
}
func (q timerQueue) Swap(i, j int) {
	q[i], q[j] = q[j], q[i]
	q[i].index = i
	q[j].index = j
}
func (q *timerQueue) Push(x any) {
	t := x.(*timerItem)
	t.index = len(*q)
	*q = append(*q, t)
}
func (q *timerQueue) Pop() any {
	old := *q
	n := len(old)
	t := old[n-1]
	t.index = -1
	*q = old[:n-1]
	return t
}
