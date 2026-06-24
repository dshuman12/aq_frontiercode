// Package scrub implements a configurable string redactor that operates
// on whole words rather than individual characters. It supplements
// internal/redaction with a denylist-based approach: instead of pattern
// matching, scrub is given an explicit list of forbidden substrings.
package scrub

import (
	"strings"
	"sync"
)

// Mode chooses the replacement style.
type Mode int

const (
	ModeAsterisks Mode = iota
	ModeBracketed
	ModeRemove
)

// Scrubber denylist-redacts strings.
type Scrubber struct {
	mu       sync.RWMutex
	denylist []string
	mode     Mode
	caseFold bool
}

// New constructs a Scrubber.
func New() *Scrubber { return &Scrubber{mode: ModeAsterisks, caseFold: true} }

// SetMode chooses how matches are replaced.
func (s *Scrubber) SetMode(m Mode) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.mode = m
}

// SetCaseFold sets whether matching ignores case (default true).
func (s *Scrubber) SetCaseFold(b bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.caseFold = b
}

// Add registers a denied substring.
func (s *Scrubber) Add(words ...string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, w := range words {
		if w != "" {
			s.denylist = append(s.denylist, w)
		}
	}
}

// Remove drops a previously denied word.
func (s *Scrubber) Remove(word string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := s.denylist[:0]
	for _, w := range s.denylist {
		if w == word {
			continue
		}
		out = append(out, w)
	}
	s.denylist = out
}

// Scrub returns text with denied substrings replaced.
func (s *Scrubber) Scrub(text string) string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := text
	for _, w := range s.denylist {
		needle := w
		hay := out
		if s.caseFold {
			needle = strings.ToLower(needle)
			hay = strings.ToLower(out)
		}
		idx := strings.Index(hay, needle)
		for idx >= 0 {
			repl := s.replacement(out[idx : idx+len(needle)])
			out = out[:idx] + repl + out[idx+len(needle):]
			if s.caseFold {
				hay = strings.ToLower(out)
			} else {
				hay = out
			}
			next := idx + len(repl)
			if next >= len(hay) {
				break
			}
			i := strings.Index(hay[next:], needle)
			if i < 0 {
				break
			}
			idx = next + i
		}
	}
	return out
}

func (s *Scrubber) replacement(matched string) string {
	switch s.mode {
	case ModeBracketed:
		return "[REDACTED]"
	case ModeRemove:
		return ""
	default:
		return strings.Repeat("*", len(matched))
	}
}

// Has returns true if word is on the denylist.
func (s *Scrubber) Has(word string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, w := range s.denylist {
		if w == word {
			return true
		}
	}
	return false
}
