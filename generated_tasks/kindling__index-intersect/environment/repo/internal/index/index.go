// Package index implements a tiny in-memory inverted index over
// the field values of [record.Record].
package index

import (
	"sort"
	"sync"

	"github.com/dleblanc/kindling/internal/record"
)

// Index maps (field, value) -> set of record ids.
type Index struct {
	mu     sync.RWMutex
	byKey  map[string]map[string]map[uint64]struct{}
	count  uint64
}

// New returns an empty index.
func New() *Index {
	return &Index{byKey: make(map[string]map[string]map[uint64]struct{})}
}

// Add indexes every (field, value) pair in r under id.
func (i *Index) Add(id uint64, r *record.Record) {
	i.mu.Lock()
	defer i.mu.Unlock()
	i.count++
	add := func(k, v string) {
		if v == "" {
			return
		}
		bucket := i.byKey[k]
		if bucket == nil {
			bucket = make(map[string]map[uint64]struct{})
			i.byKey[k] = bucket
		}
		set := bucket[v]
		if set == nil {
			set = make(map[uint64]struct{})
			bucket[v] = set
		}
		set[id] = struct{}{}
	}
	add("level", r.Level)
	add("service", r.Service)
	for k, v := range r.Fields {
		add(k, v)
	}
}

// Lookup returns the sorted list of record ids for which key=value.
func (i *Index) Lookup(key, value string) []uint64 {
	i.mu.RLock()
	defer i.mu.RUnlock()
	bucket := i.byKey[key]
	if bucket == nil {
		return nil
	}
	set := bucket[value]
	if len(set) == 0 {
		return nil
	}
	out := make([]uint64, 0, len(set))
	for id := range set {
		out = append(out, id)
	}
	sort.Slice(out, func(a, b int) bool { return out[a] < out[b] })
	return out
}

// Cardinality returns the number of distinct values under key.
func (i *Index) Cardinality(key string) int {
	i.mu.RLock()
	defer i.mu.RUnlock()
	bucket := i.byKey[key]
	return len(bucket)
}

// Keys returns the indexed field names in deterministic (sorted) order.
func (i *Index) Keys() []string {
	i.mu.RLock()
	defer i.mu.RUnlock()
	out := make([]string, 0, len(i.byKey))
	for k := range i.byKey {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// Count returns the number of records added.
func (i *Index) Count() uint64 {
	i.mu.RLock()
	defer i.mu.RUnlock()
	return i.count
}

// Intersect returns the sorted union of all sets matching every (k, v) in kv.
func (i *Index) Intersect(kv map[string]string) []uint64 {
	if len(kv) == 0 {
		return nil
	}
	var first []uint64
	firstKey := ""
	for k := range kv {
		if first == nil {
			first = i.Lookup(k, kv[k])
			firstKey = k
		}
	}
	if len(first) == 0 {
		return nil
	}
	out := first
	for k, v := range kv {
		if k == firstKey {
			continue
		}
		other := i.Lookup(k, v)
		out = intersectSorted(out, other)
		if len(out) == 0 {
			return nil
		}
	}
	return out
}

func intersectSorted(a, b []uint64) []uint64 {
	out := []uint64{}
	i, j := 0, 0
	for i < len(a) && j < len(b) {
		switch {
		case a[i] == b[j]:
			out = append(out, a[i])
			i++
		case a[i] < b[j]:
			i++
		default:
			j++
		}
	}
	return out
}
