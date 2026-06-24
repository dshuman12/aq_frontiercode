// Package treemap is a B-tree-like sorted map.
package treemap

import "sort"

// Map is a sorted map keyed by string.
type Map struct {
	keys []string
	vals []any
}

// New returns an empty map.
func New() *Map { return &Map{} }

// Len returns the number of items.
func (m *Map) Len() int { return len(m.keys) }

// Get returns the value for k.
func (m *Map) Get(k string) (any, bool) {
	idx := sort.SearchStrings(m.keys, k)
	if idx < len(m.keys) && m.keys[idx] == k {
		return m.vals[idx], true
	}
	return nil, false
}

// Set inserts or overwrites k.
func (m *Map) Set(k string, v any) {
	idx := sort.SearchStrings(m.keys, k)
	if idx < len(m.keys) && m.keys[idx] == k {
		m.vals[idx] = v
		return
	}
	m.keys = append(m.keys, "")
	m.vals = append(m.vals, nil)
	copy(m.keys[idx+1:], m.keys[idx:])
	copy(m.vals[idx+1:], m.vals[idx:])
	m.keys[idx] = k
	m.vals[idx] = v
}

// Delete removes k. Returns true when present.
func (m *Map) Delete(k string) bool {
	idx := sort.SearchStrings(m.keys, k)
	if idx >= len(m.keys) || m.keys[idx] != k {
		return false
	}
	m.keys = append(m.keys[:idx], m.keys[idx+1:]...)
	m.vals = append(m.vals[:idx], m.vals[idx+1:]...)
	return true
}

// Keys returns a copy of the (sorted) key list.
func (m *Map) Keys() []string {
	out := make([]string, len(m.keys))
	copy(out, m.keys)
	return out
}

// Range invokes fn(k, v) for every entry in sorted order. Stops early
// when fn returns false.
func (m *Map) Range(fn func(k string, v any) bool) {
	for i, k := range m.keys {
		if !fn(k, m.vals[i]) {
			return
		}
	}
}

// Clear empties the map.
func (m *Map) Clear() {
	m.keys = m.keys[:0]
	m.vals = m.vals[:0]
}

// PrefixMatches returns the keys that start with prefix.
func (m *Map) PrefixMatches(prefix string) []string {
	idx := sort.SearchStrings(m.keys, prefix)
	var out []string
	for i := idx; i < len(m.keys); i++ {
		k := m.keys[i]
		if !startsWith(k, prefix) {
			break
		}
		out = append(out, k)
	}
	return out
}

func startsWith(s, prefix string) bool {
	return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}
