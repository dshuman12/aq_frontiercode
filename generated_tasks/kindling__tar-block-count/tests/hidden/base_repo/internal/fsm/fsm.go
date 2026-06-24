// Package fsm implements a small string-keyed deterministic finite state
// machine, used to model the per-job lifecycle in kindling's pipeline:
// pending -> running -> {done|failed} with allowed retry edges.
package fsm

import (
	"errors"
	"fmt"
	"sync"
)

// Transition describes one allowed edge.
type Transition struct {
	From  string
	Event string
	To    string
}

// Machine is a deterministic FSM.
type Machine struct {
	mu         sync.Mutex
	state      string
	initial    string
	moves      map[string]map[string]string
	hooks      []HookFn
	history    []string
	maxHistory int
}

// HookFn is invoked after each successful transition.
type HookFn func(from, event, to string)

// New builds a Machine.
func New(initial string, transitions []Transition) *Machine {
	m := &Machine{
		state:      initial,
		initial:    initial,
		moves:      map[string]map[string]string{},
		maxHistory: 64,
	}
	for _, t := range transitions {
		bucket, ok := m.moves[t.From]
		if !ok {
			bucket = map[string]string{}
			m.moves[t.From] = bucket
		}
		bucket[t.Event] = t.To
	}
	return m
}

// State returns the current state.
func (m *Machine) State() string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.state
}

// Can reports whether event is allowed from the current state.
func (m *Machine) Can(event string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, ok := m.moves[m.state][event]
	return ok
}

// Fire applies event.
func (m *Machine) Fire(event string) error {
	m.mu.Lock()
	to, ok := m.moves[m.state][event]
	if !ok {
		m.mu.Unlock()
		return fmt.Errorf("fsm: no transition for %q from %q", event, m.state)
	}
	from := m.state
	m.state = to
	m.history = append(m.history, fmt.Sprintf("%s -%s-> %s", from, event, to))
	if len(m.history) > m.maxHistory {
		m.history = m.history[1:]
	}
	hooks := append([]HookFn(nil), m.hooks...)
	m.mu.Unlock()
	for _, h := range hooks {
		h(from, event, to)
	}
	return nil
}

// AddHook registers a transition hook.
func (m *Machine) AddHook(h HookFn) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.hooks = append(m.hooks, h)
}

// History returns a copy of the recent transition log.
func (m *Machine) History() []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]string, len(m.history))
	copy(out, m.history)
	return out
}

// Reset returns the machine to its initial state and clears history.
func (m *Machine) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state = m.initial
	m.history = nil
}

// ErrUnknownState is returned by Force when state has no entries.
var ErrUnknownState = errors.New("fsm: unknown state")

// Force jumps to state without firing events. Use sparingly: it bypasses
// the transition graph and is intended for restoring persisted state.
func (m *Machine) Force(state string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.moves[state]; !ok && state != m.initial {
		// Allow forcing into a terminal state too.
		seenAsTarget := false
		for _, bucket := range m.moves {
			for _, to := range bucket {
				if to == state {
					seenAsTarget = true
					break
				}
			}
		}
		if !seenAsTarget {
			return ErrUnknownState
		}
	}
	m.state = state
	return nil
}
