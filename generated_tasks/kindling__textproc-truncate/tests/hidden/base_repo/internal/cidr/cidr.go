// Package cidr implements an in-memory CIDR membership tester used to
// classify log records by network of origin.
//
// The implementation is a simple linear scan over registered prefixes;
// the expected number of prefixes (a few hundred) makes more elaborate
// data structures (radix trees, interval trees) unnecessary at this scale.
package cidr

import (
	"errors"
	"net"
	"sort"
	"strings"
)

// Entry is one CIDR with a tag.
type Entry struct {
	Net *net.IPNet
	Tag string
}

// Set is an ordered collection of Entries.
type Set struct {
	entries []Entry
}

// New constructs an empty Set.
func New() *Set { return &Set{} }

// Add registers cidr with tag.
func (s *Set) Add(cidr, tag string) error {
	if cidr == "" {
		return errors.New("cidr: empty cidr")
	}
	_, n, err := net.ParseCIDR(cidr)
	if err != nil {
		return err
	}
	s.entries = append(s.entries, Entry{Net: n, Tag: tag})
	sort.SliceStable(s.entries, func(i, j int) bool {
		oi, _ := s.entries[i].Net.Mask.Size()
		oj, _ := s.entries[j].Net.Mask.Size()
		return oi > oj // most-specific first
	})
	return nil
}

// Lookup returns the most-specific match for ip.
func (s *Set) Lookup(ip string) (string, bool) {
	parsed := net.ParseIP(strings.TrimSpace(ip))
	if parsed == nil {
		return "", false
	}
	for _, e := range s.entries {
		if e.Net.Contains(parsed) {
			return e.Tag, true
		}
	}
	return "", false
}

// Len reports how many entries are registered.
func (s *Set) Len() int { return len(s.entries) }

// Tags returns all unique tags currently registered.
func (s *Set) Tags() []string {
	seen := map[string]struct{}{}
	out := []string{}
	for _, e := range s.entries {
		if _, ok := seen[e.Tag]; ok {
			continue
		}
		seen[e.Tag] = struct{}{}
		out = append(out, e.Tag)
	}
	sort.Strings(out)
	return out
}
