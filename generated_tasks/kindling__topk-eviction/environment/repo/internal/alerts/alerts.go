// Package alerts evaluates threshold rules against time-bucketed data
// and emits state transitions (firing -> resolved -> firing) suitable
// for downstream notifiers.
package alerts

import (
	"fmt"
	"sort"
	"sync"
	"time"
)

// Severity grades an alert.
type Severity string

const (
	SevInfo     Severity = "info"
	SevWarning  Severity = "warning"
	SevCritical Severity = "critical"
)

// Rule is one alert rule.
type Rule struct {
	Name      string
	Severity  Severity
	Threshold float64
	Op        string // ">", "<", ">=", "<=", "==", "!="
	For       time.Duration
	Labels    map[string]string
	Annotation string
}

// Sample is a single observation against a rule.
type Sample struct {
	Time  time.Time
	Value float64
}

// State is the lifecycle of an alert.
type State int

const (
	StateInactive State = iota
	StatePending
	StateFiring
	StateResolved
)

func (s State) String() string {
	switch s {
	case StateInactive:
		return "inactive"
	case StatePending:
		return "pending"
	case StateFiring:
		return "firing"
	case StateResolved:
		return "resolved"
	}
	return "unknown"
}

// Alert is the in-memory record of a triggered rule.
type Alert struct {
	Rule    *Rule
	State   State
	Since   time.Time
	LastVal float64
}

// Engine evaluates rules and tracks alerts.
type Engine struct {
	mu     sync.Mutex
	rules  map[string]*Rule
	alerts map[string]*Alert
	now    func() time.Time
}

// NewEngine constructs an Engine.
func NewEngine() *Engine {
	return &Engine{
		rules:  map[string]*Rule{},
		alerts: map[string]*Alert{},
		now:    time.Now,
	}
}

// SetClock overrides the time source.
func (e *Engine) SetClock(fn func() time.Time) { e.now = fn }

// Register adds or updates rule.
func (e *Engine) Register(r *Rule) error {
	if r.Name == "" {
		return fmt.Errorf("alerts: rule name required")
	}
	switch r.Op {
	case ">", "<", ">=", "<=", "==", "!=":
	default:
		return fmt.Errorf("alerts: unsupported op %q", r.Op)
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	e.rules[r.Name] = r
	if _, ok := e.alerts[r.Name]; !ok {
		e.alerts[r.Name] = &Alert{Rule: r, State: StateInactive}
	}
	return nil
}

// Observe records a new value for the named rule.
func (e *Engine) Observe(name string, s Sample) {
	e.mu.Lock()
	defer e.mu.Unlock()
	rule, ok := e.rules[name]
	if !ok {
		return
	}
	alert := e.alerts[name]
	alert.LastVal = s.Value
	if compare(s.Value, rule.Op, rule.Threshold) {
		switch alert.State {
		case StateInactive, StateResolved:
			alert.State = StatePending
			alert.Since = s.Time
		case StatePending:
			if s.Time.Sub(alert.Since) >= rule.For {
				alert.State = StateFiring
				alert.Since = s.Time
			}
		}
		return
	}
	switch alert.State {
	case StatePending, StateFiring:
		alert.State = StateResolved
		alert.Since = s.Time
	}
}

// Snapshot returns all alerts in deterministic order.
func (e *Engine) Snapshot() []*Alert {
	e.mu.Lock()
	defer e.mu.Unlock()
	out := make([]*Alert, 0, len(e.alerts))
	for _, a := range e.alerts {
		out = append(out, a)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Rule.Name < out[j].Rule.Name })
	return out
}

// Active returns only firing alerts.
func (e *Engine) Active() []*Alert {
	e.mu.Lock()
	defer e.mu.Unlock()
	var out []*Alert
	for _, a := range e.alerts {
		if a.State == StateFiring {
			out = append(out, a)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Rule.Name < out[j].Rule.Name })
	return out
}

func compare(v float64, op string, t float64) bool {
	switch op {
	case ">":
		return v > t
	case "<":
		return v < t
	case ">=":
		return v >= t
	case "<=":
		return v <= t
	case "==":
		return v == t
	case "!=":
		return v != t
	}
	return false
}
