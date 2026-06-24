// Package validate2 evaluates a configurable set of validation rules
// against records. Rules can be combined into named profiles and run as
// a fail-fast or collect-all batch.
package validate2

import (
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/dleblanc/kindling/internal/record"
)

// Rule represents one named validation rule.
type Rule interface {
	Name() string
	Apply(rec *record.Record) error
}

// Profile bundles multiple rules under a name.
type Profile struct {
	Name  string
	Rules []Rule
}

// Result is the outcome of running a Profile.
type Result struct {
	Errors    []error
	OK        bool
	Validated int
}

// Run validates rec against profile.
func Run(profile *Profile, rec *record.Record, failFast bool) Result {
	res := Result{Validated: 1}
	if profile == nil {
		res.OK = true
		return res
	}
	for _, r := range profile.Rules {
		if err := r.Apply(rec); err != nil {
			res.Errors = append(res.Errors, fmt.Errorf("%s: %w", r.Name(), err))
			if failFast {
				return res
			}
		}
	}
	res.OK = len(res.Errors) == 0
	return res
}

// RunAll validates a batch of records.
func RunAll(profile *Profile, records []*record.Record, failFast bool) Result {
	res := Result{}
	for _, rec := range records {
		one := Run(profile, rec, failFast)
		res.Errors = append(res.Errors, one.Errors...)
		res.Validated += one.Validated
		if failFast && len(res.Errors) > 0 {
			return res
		}
	}
	res.OK = len(res.Errors) == 0
	return res
}

// Registry stores reusable Rules.
type Registry struct {
	mu    sync.RWMutex
	rules map[string]Rule
}

// NewRegistry constructs a Registry.
func NewRegistry() *Registry { return &Registry{rules: map[string]Rule{}} }

// Register adds a rule.
func (r *Registry) Register(rule Rule) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.rules[rule.Name()] = rule
}

// Get returns a rule by name.
func (r *Registry) Get(name string) (Rule, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	rule, ok := r.rules[name]
	return rule, ok
}

// Names returns the registered names sorted alphabetically.
func (r *Registry) Names() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]string, 0, len(r.rules))
	for n := range r.rules {
		out = append(out, n)
	}
	sort.Strings(out)
	return out
}

// BuildProfile composes a Profile from rule names.
func (r *Registry) BuildProfile(name string, ruleNames ...string) (*Profile, error) {
	rules := make([]Rule, 0, len(ruleNames))
	for _, n := range ruleNames {
		rule, ok := r.Get(n)
		if !ok {
			return nil, fmt.Errorf("validate2: unknown rule %q", n)
		}
		rules = append(rules, rule)
	}
	return &Profile{Name: name, Rules: rules}, nil
}

// ----- built-in rules -----

// LevelRequired ensures Level is non-empty.
type LevelRequired struct{}

// Name returns the rule's identifier.
func (LevelRequired) Name() string { return "level-required" }

// Apply enforces the rule.
func (LevelRequired) Apply(rec *record.Record) error {
	if rec.Level == "" {
		return errors.New("level is empty")
	}
	return nil
}

// LevelInSet ensures Level is one of an enumerated set.
type LevelInSet struct {
	Allowed map[string]struct{}
}

// NewLevelInSet builds a rule from a list of allowed levels.
func NewLevelInSet(levels ...string) LevelInSet {
	set := map[string]struct{}{}
	for _, l := range levels {
		set[strings.ToLower(l)] = struct{}{}
	}
	return LevelInSet{Allowed: set}
}

// Name returns "level-set".
func (LevelInSet) Name() string { return "level-set" }

// Apply checks rec.Level membership.
func (l LevelInSet) Apply(rec *record.Record) error {
	if _, ok := l.Allowed[strings.ToLower(rec.Level)]; !ok {
		return fmt.Errorf("level %q not in allowed set", rec.Level)
	}
	return nil
}

// MessageRegex ensures Message matches.
type MessageRegex struct {
	RE *regexp.Regexp
}

// NewMessageRegex compiles re.
func NewMessageRegex(re string) (MessageRegex, error) {
	r, err := regexp.Compile(re)
	if err != nil {
		return MessageRegex{}, err
	}
	return MessageRegex{RE: r}, nil
}

// Name returns "msg-regex".
func (MessageRegex) Name() string { return "msg-regex" }

// Apply matches against rec.Message.
func (m MessageRegex) Apply(rec *record.Record) error {
	if !m.RE.MatchString(rec.Message) {
		return fmt.Errorf("message %q did not match %s", rec.Message, m.RE.String())
	}
	return nil
}

// FieldRequired ensures a key exists in rec.Fields.
type FieldRequired struct {
	Field string
}

// Name returns "field-required".
func (f FieldRequired) Name() string { return "field-required:" + f.Field }

// Apply enforces the rule.
func (f FieldRequired) Apply(rec *record.Record) error {
	if _, ok := rec.Fields[f.Field]; !ok {
		return fmt.Errorf("missing field %q", f.Field)
	}
	return nil
}

// TimestampRecent enforces that rec.Timestamp is within d of now.
type TimestampRecent struct {
	D   time.Duration
	Now func() time.Time
}

// Name returns "timestamp-recent".
func (TimestampRecent) Name() string { return "timestamp-recent" }

// Apply checks freshness.
func (t TimestampRecent) Apply(rec *record.Record) error {
	now := time.Now
	if t.Now != nil {
		now = t.Now
	}
	if now().Sub(rec.Timestamp) >= t.D {
		return fmt.Errorf("timestamp older than %s", t.D)
	}
	return nil
}

// ServiceMatchSet enforces that Service is in a set.
type ServiceMatchSet struct {
	Allowed map[string]struct{}
}

// NewServiceMatchSet builds a rule from a list of allowed services.
func NewServiceMatchSet(services ...string) ServiceMatchSet {
	set := map[string]struct{}{}
	for _, s := range services {
		set[s] = struct{}{}
	}
	return ServiceMatchSet{Allowed: set}
}

// Name returns "service-set".
func (ServiceMatchSet) Name() string { return "service-set" }

// Apply enforces membership.
func (s ServiceMatchSet) Apply(rec *record.Record) error {
	if _, ok := s.Allowed[rec.Service]; !ok {
		return fmt.Errorf("service %q not in allowed set", rec.Service)
	}
	return nil
}
