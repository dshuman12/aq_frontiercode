// Package shardmap implements a sharded concurrent map keyed by string.
// Each shard has its own RWMutex; under heavy multi-producer workloads
// this avoids the single-mutex contention of sync.Map's amend path.
package shardmap

import (
	"hash/fnv"
	"sync"
)

const defaultShards = 32

// Map is the sharded map.
type Map[V any] struct {
	shards    []*shard[V]
	shardMask uint32
}

type shard[V any] struct {
	mu sync.RWMutex
	m  map[string]V
}

// New constructs a Map with shardCount shards (rounded up to a power of 2).
func New[V any](shardCount int) *Map[V] {
	if shardCount <= 0 {
		shardCount = defaultShards
	}
	pow := 1
	for pow < shardCount {
		pow <<= 1
	}
	shards := make([]*shard[V], pow)
	for i := range shards {
		shards[i] = &shard[V]{m: map[string]V{}}
	}
	return &Map[V]{shards: shards, shardMask: uint32(pow - 1)}
}

func (m *Map[V]) shardFor(key string) *shard[V] {
	h := fnv.New32a()
	_, _ = h.Write([]byte(key))
	return m.shards[h.Sum32()&m.shardMask]
}

// Set inserts or updates key.
func (m *Map[V]) Set(key string, value V) {
	s := m.shardFor(key)
	s.mu.Lock()
	defer s.mu.Unlock()
	s.m[key] = value
}

// Get returns the value for key.
func (m *Map[V]) Get(key string) (V, bool) {
	s := m.shardFor(key)
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.m[key]
	return v, ok
}

// Delete removes key.
func (m *Map[V]) Delete(key string) {
	s := m.shardFor(key)
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.m, key)
}

// Len returns the total number of entries across all shards.
func (m *Map[V]) Len() int {
	n := 0
	for _, s := range m.shards {
		s.mu.RLock()
		n += len(s.m)
		s.mu.RUnlock()
	}
	return n
}

// Update applies fn to the value at key, allowing in-place mutation
// without racing with other writers.
func (m *Map[V]) Update(key string, fn func(prev V, ok bool) V) V {
	s := m.shardFor(key)
	s.mu.Lock()
	defer s.mu.Unlock()
	v, ok := s.m[key]
	v = fn(v, ok)
	s.m[key] = v
	return v
}

// Each invokes fn for every key/value, in shard order. fn may return
// false to stop early.
func (m *Map[V]) Each(fn func(key string, value V) bool) {
	for _, s := range m.shards {
		s.mu.RLock()
		for k, v := range s.m {
			if !fn(k, v) {
				s.mu.RUnlock()
				return
			}
		}
		s.mu.RUnlock()
	}
}
