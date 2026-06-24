// Package ipfilter implements an allow/deny list for incoming records,
// composed from CIDR rules. Decisions follow longest-prefix match;
// equal-prefix conflicts default to deny.
package ipfilter

import (
	"errors"
	"net"
	"sort"
	"strings"
	"sync"
)

// Decision is the verdict.
type Decision int

const (
	DecisionAllow Decision = iota
	DecisionDeny
)

func (d Decision) String() string {
	if d == DecisionAllow {
		return "allow"
	}
	return "deny"
}

// Rule is one CIDR rule with an action.
type Rule struct {
	CIDR     *net.IPNet
	Decision Decision
}

// Filter is a thread-safe ip filter.
type Filter struct {
	mu              sync.RWMutex
	rules           []Rule
	defaultDecision Decision
}

// New constructs a Filter with the given default decision.
func New(def Decision) *Filter { return &Filter{defaultDecision: def} }

// Allow adds a CIDR allow rule.
func (f *Filter) Allow(cidr string) error {
	return f.add(cidr, DecisionAllow)
}

// Deny adds a CIDR deny rule.
func (f *Filter) Deny(cidr string) error {
	return f.add(cidr, DecisionDeny)
}

func (f *Filter) add(cidr string, d Decision) error {
	if cidr == "" {
		return errors.New("ipfilter: empty cidr")
	}
	_, n, err := net.ParseCIDR(cidr)
	if err != nil {
		return err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.rules = append(f.rules, Rule{CIDR: n, Decision: d})
	sort.SliceStable(f.rules, func(i, j int) bool {
		oi, _ := f.rules[i].CIDR.Mask.Size()
		oj, _ := f.rules[j].CIDR.Mask.Size()
		return oi > oj // most-specific first
	})
	return nil
}

// Decide returns the longest-prefix match decision for ip.
func (f *Filter) Decide(ip string) Decision {
	parsed := net.ParseIP(strings.TrimSpace(ip))
	if parsed == nil {
		return f.defaultDecision
	}
	f.mu.RLock()
	defer f.mu.RUnlock()
	for _, r := range f.rules {
		if r.CIDR.Contains(parsed) {
			return r.Decision
		}
	}
	return f.defaultDecision
}

// Rules returns a copy of the registered rules.
func (f *Filter) Rules() []Rule {
	f.mu.RLock()
	defer f.mu.RUnlock()
	out := make([]Rule, len(f.rules))
	copy(out, f.rules)
	return out
}

// Reset clears all rules.
func (f *Filter) Reset() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.rules = nil
}
