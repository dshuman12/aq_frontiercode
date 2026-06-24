// Package levelmap implements a simple LSM-style key/value index in
// memory. Inserts go to the active "memtable"; once it crosses a size
// threshold the memtable is sealed into an immutable "level". Lookups
// search the memtable then walk levels newest-to-oldest.
//
// This is a teaching implementation for the kindling deduplication
// pipeline; it deliberately omits compaction and disk persistence.
package levelmap

import (
	"sort"
	"sync"
)

// Tomb marks a deletion.
type Tomb struct{}

type level struct {
	keys   []string
	values []any
}

// LevelMap is the LSM-like map.
type LevelMap struct {
	mu        sync.RWMutex
	threshold int
	mem       map[string]any
	levels    []*level
}

// New constructs a LevelMap; threshold is the active map size at which a
// new level is sealed.
func New(threshold int) *LevelMap {
	if threshold <= 0 {
		threshold = 64
	}
	return &LevelMap{
		threshold: threshold,
		mem:       map[string]any{},
	}
}

// Set inserts or updates key.
func (l *LevelMap) Set(key string, value any) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.mem[key] = value
	if len(l.mem) >= l.threshold {
		l.sealLocked()
	}
}

// Delete marks key as deleted.
func (l *LevelMap) Delete(key string) {
	l.Set(key, Tomb{})
}

// Get returns the value for key.
func (l *LevelMap) Get(key string) (any, bool) {
	l.mu.RLock()
	defer l.mu.RUnlock()
	if v, ok := l.mem[key]; ok {
		if _, t := v.(Tomb); t {
			return nil, false
		}
		return v, true
	}
	for i := len(l.levels) - 1; i >= 0; i-- {
		lvl := l.levels[i]
		idx := sort.SearchStrings(lvl.keys, key)
		if idx < len(lvl.keys) && lvl.keys[idx] == key {
			v := lvl.values[idx]
			if _, t := v.(Tomb); t {
				return nil, false
			}
			return v, true
		}
	}
	return nil, false
}

// Len returns the total entries (including tombstones) across all levels.
func (l *LevelMap) Len() int {
	l.mu.RLock()
	defer l.mu.RUnlock()
	n := len(l.mem)
	for _, lvl := range l.levels {
		n += len(lvl.keys)
	}
	return n
}

// Levels returns the number of sealed levels.
func (l *LevelMap) Levels() int {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return len(l.levels)
}

// Flush forces the active memtable to seal.
func (l *LevelMap) Flush() {
	l.mu.Lock()
	defer l.mu.Unlock()
	if len(l.mem) == 0 {
		return
	}
	l.sealLocked()
}

func (l *LevelMap) sealLocked() {
	keys := make([]string, 0, len(l.mem))
	for k := range l.mem {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	values := make([]any, len(keys))
	for i, k := range keys {
		values[i] = l.mem[k]
	}
	l.levels = append(l.levels, &level{keys: keys, values: values})
	l.mem = map[string]any{}
}
