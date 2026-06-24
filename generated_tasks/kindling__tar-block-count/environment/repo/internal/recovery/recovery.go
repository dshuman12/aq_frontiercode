// Package recovery provides helpers that wrap user code in recover() so
// that a single bad goroutine does not bring down the entire kindling
// daemon. Recovered panics are logged and surfaced to the caller via a
// channel.
package recovery

import (
	"fmt"
	"runtime/debug"
	"sync"
)

// PanicInfo captures one recovered panic.
type PanicInfo struct {
	Goroutine string
	Value     any
	Stack     []byte
}

// Recoverer wraps work in recover().
type Recoverer struct {
	mu      sync.Mutex
	last    *PanicInfo
	count   int
	onPanic func(PanicInfo)
}

// New constructs a Recoverer.
func New() *Recoverer { return &Recoverer{} }

// SetHandler registers a callback invoked on panic.
func (r *Recoverer) SetHandler(fn func(PanicInfo)) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.onPanic = fn
}

// Run invokes fn within recover; panics are captured.
func (r *Recoverer) Run(name string, fn func()) (recovered bool) {
	defer func() {
		if v := recover(); v != nil {
			info := PanicInfo{Goroutine: name, Value: v, Stack: debug.Stack()}
			r.mu.Lock()
			r.last = &info
			r.count++
			cb := r.onPanic
			r.mu.Unlock()
			if cb != nil {
				cb(info)
			}
			recovered = true
		}
	}()
	fn()
	return false
}

// Go runs fn in a new goroutine wrapped by Run.
func (r *Recoverer) Go(name string, fn func()) {
	go r.Run(name, fn)
}

// Last returns the most recent recovered panic, if any.
func (r *Recoverer) Last() *PanicInfo {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.last
}

// Count returns the total number of recovered panics.
func (r *Recoverer) Count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.count
}

// Format renders info into a multi-line string.
func Format(info PanicInfo) string {
	return fmt.Sprintf("panic in %s: %v\n%s", info.Goroutine, info.Value, info.Stack)
}
