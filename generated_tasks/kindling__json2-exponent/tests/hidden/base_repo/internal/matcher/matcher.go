// Package matcher implements a multi-substring matcher used by the
// query engine for fast prefix scanning.
package matcher

// Multi is a set of literal patterns indexed by first character.
type Multi struct {
	patterns []string
	byFirst  map[byte][]int
}

// Build returns a matcher over the given patterns.
func Build(patterns []string) *Multi {
	m := &Multi{patterns: append([]string(nil), patterns...), byFirst: map[byte][]int{}}
	for i, p := range patterns {
		if len(p) == 0 {
			continue
		}
		m.byFirst[p[0]] = append(m.byFirst[p[0]], i)
	}
	return m
}

// ContainsAny returns true when any pattern is a substring of text.
func (m *Multi) ContainsAny(text string) bool {
	if len(m.patterns) == 0 {
		return false
	}
	for i := 0; i < len(text); i++ {
		ch := text[i]
		for _, idx := range m.byFirst[ch] {
			p := m.patterns[idx]
			if i+len(p) <= len(text) && text[i:i+len(p)] == p {
				return true
			}
		}
	}
	return false
}

// FindAll returns indexes of every pattern occurring in text.
func (m *Multi) FindAll(text string) []int {
	hits := map[int]struct{}{}
	for i := 0; i < len(text); i++ {
		ch := text[i]
		for _, idx := range m.byFirst[ch] {
			p := m.patterns[idx]
			if i+len(p) <= len(text) && text[i:i+len(p)] == p {
				hits[idx] = struct{}{}
			}
		}
	}
	out := make([]int, 0, len(hits))
	for k := range hits {
		out = append(out, k)
	}
	for i := 1; i < len(out); i++ {
		for j := i; j > 0 && out[j-1] > out[j]; j-- {
			out[j-1], out[j] = out[j], out[j-1]
		}
	}
	return out
}

// Len returns the number of patterns.
func (m *Multi) Len() int { return len(m.patterns) }

// Patterns returns a copy of the registered patterns.
func (m *Multi) Patterns() []string {
	out := make([]string, len(m.patterns))
	copy(out, m.patterns)
	return out
}
