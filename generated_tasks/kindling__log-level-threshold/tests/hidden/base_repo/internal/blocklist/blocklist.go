// Package blocklist composes multiple sources of denied tokens (regex,
// glob, exact) into a single fast-check API. The composite layer
// memoises decisions per token to keep hot-path checks O(1).
package blocklist

import (
	"errors"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
)

// Rule is a registered rule.
type Rule struct {
	Kind string // "exact", "glob", "regex"
	Spec string
	Note string

	exactSet map[string]struct{}
	glob     string
	regex    *regexp.Regexp
}

// List composes rules.
type List struct {
	mu    sync.RWMutex
	rules []Rule
	cache map[string]bool
}

// New constructs a List.
func New() *List { return &List{cache: map[string]bool{}} }

// AddExact registers an exact-match rule. Multiple values may be passed.
func (l *List) AddExact(values ...string) {
	r := Rule{Kind: "exact", exactSet: map[string]struct{}{}}
	for _, v := range values {
		r.exactSet[v] = struct{}{}
	}
	l.add(r)
}

// AddGlob registers a glob rule (filepath.Match semantics).
func (l *List) AddGlob(pattern string) error {
	if _, err := filepath.Match(pattern, ""); err != nil {
		return err
	}
	l.add(Rule{Kind: "glob", glob: pattern, Spec: pattern})
	return nil
}

// AddRegex registers a regex rule.
func (l *List) AddRegex(pattern string) error {
	re, err := regexp.Compile(pattern)
	if err != nil {
		return err
	}
	l.add(Rule{Kind: "regex", regex: re, Spec: pattern})
	return nil
}

func (l *List) add(r Rule) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.rules = append(l.rules, r)
	l.cache = map[string]bool{}
}

// Allowed returns true when value is NOT blocked.
func (l *List) Allowed(value string) bool { return !l.Blocked(value) }

// Blocked checks the rules.
func (l *List) Blocked(value string) bool {
	l.mu.RLock()
	if v, ok := l.cache[value]; ok {
		l.mu.RUnlock()
		return v
	}
	l.mu.RUnlock()
	l.mu.Lock()
	defer l.mu.Unlock()
	if v, ok := l.cache[value]; ok {
		return v
	}
	blocked := l.matchLocked(value)
	l.cache[value] = blocked
	return blocked
}

func (l *List) matchLocked(value string) bool {
	for _, r := range l.rules {
		switch r.Kind {
		case "exact":
			if _, ok := r.exactSet[value]; ok {
				return true
			}
		case "glob":
			if ok, _ := filepath.Match(r.glob, value); ok {
				return true
			}
		case "regex":
			if r.regex.MatchString(value) {
				return true
			}
		}
	}
	return false
}

// Reset clears all rules.
func (l *List) Reset() {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.rules = nil
	l.cache = map[string]bool{}
}

// Describe returns a stable summary string.
func (l *List) Describe() string {
	l.mu.RLock()
	defer l.mu.RUnlock()
	var b strings.Builder
	for _, r := range l.rules {
		b.WriteString(r.Kind + ":" + r.Spec + "\n")
	}
	return b.String()
}

// ErrUnknownKind is returned for unsupported rule kinds.
var ErrUnknownKind = errors.New("blocklist: unknown rule kind")

// AddRule registers a Rule by kind/spec strings.
func (l *List) AddRule(kind, spec string) error {
	switch kind {
	case "exact":
		l.AddExact(spec)
		return nil
	case "glob":
		return l.AddGlob(spec)
	case "regex":
		return l.AddRegex(spec)
	}
	return ErrUnknownKind
}
