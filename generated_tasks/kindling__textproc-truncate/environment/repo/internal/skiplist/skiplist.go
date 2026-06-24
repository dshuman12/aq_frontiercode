// Package skiplist implements a probabilistic skip list keyed by string.
//
// Skip lists offer O(log n) expected-time inserts, deletes, and lookups
// without rotation rebalancing, which makes them attractive for
// concurrency-friendly variants. This implementation is single-threaded
// and intended for use as an alternative ordered index in tests where the
// B-tree-like structures in internal/treemap are too heavy.
package skiplist

import (
	"math/rand"
	"strings"
)

const (
	maxLevel = 32
	pBranch  = 0.25
)

type node struct {
	key   string
	value any
	next  []*node
}

// SkipList is a sorted set of string keys.
type SkipList struct {
	head  *node
	level int
	rand  *rand.Rand
	size  int
}

// New constructs an empty SkipList seeded by seed.
func New(seed int64) *SkipList {
	return &SkipList{
		head:  &node{next: make([]*node, maxLevel)},
		level: 1,
		rand:  rand.New(rand.NewSource(seed)),
	}
}

func (s *SkipList) randomLevel() int {
	lvl := 1
	for lvl < maxLevel && s.rand.Float64() < pBranch {
		lvl++
	}
	return lvl
}

// Set inserts or updates key.
func (s *SkipList) Set(key string, value any) {
	update := make([]*node, maxLevel)
	x := s.head
	for i := s.level - 1; i >= 0; i-- {
		for x.next[i] != nil && strings.Compare(x.next[i].key, key) < 0 {
			x = x.next[i]
		}
		update[i] = x
	}
	if x.next[0] != nil && x.next[0].key == key {
		x.next[0].value = value
		return
	}
	lvl := s.randomLevel()
	if lvl > s.level {
		for i := s.level; i < lvl; i++ {
			update[i] = s.head
		}
		s.level = lvl
	}
	n := &node{key: key, value: value, next: make([]*node, lvl)}
	for i := 0; i < lvl; i++ {
		n.next[i] = update[i].next[i]
		update[i].next[i] = n
	}
	s.size++
}

// Get returns the value for key.
func (s *SkipList) Get(key string) (any, bool) {
	x := s.head
	for i := s.level - 1; i >= 0; i-- {
		for x.next[i] != nil && strings.Compare(x.next[i].key, key) < 0 {
			x = x.next[i]
		}
	}
	if x.next[0] != nil && x.next[0].key == key {
		return x.next[0].value, true
	}
	return nil, false
}

// Delete removes key, returning true if it was present.
func (s *SkipList) Delete(key string) bool {
	update := make([]*node, maxLevel)
	x := s.head
	for i := s.level - 1; i >= 0; i-- {
		for x.next[i] != nil && strings.Compare(x.next[i].key, key) < 0 {
			x = x.next[i]
		}
		update[i] = x
	}
	target := x.next[0]
	if target == nil || target.key != key {
		return false
	}
	for i := 0; i < s.level; i++ {
		if update[i].next[i] != target {
			break
		}
		update[i].next[i] = target.next[i]
	}
	for s.level > 1 && s.head.next[s.level-1] == nil {
		s.level--
	}
	s.size--
	return true
}

// Len reports the number of stored keys.
func (s *SkipList) Len() int { return s.size }

// Range invokes fn for each key in [lo, hi). fn may return false to stop.
func (s *SkipList) Range(lo, hi string, fn func(key string, value any) bool) {
	x := s.head
	for i := s.level - 1; i >= 0; i-- {
		for x.next[i] != nil && strings.Compare(x.next[i].key, lo) < 0 {
			x = x.next[i]
		}
	}
	cur := x.next[0]
	for cur != nil && (hi == "" || strings.Compare(cur.key, hi) < 0) {
		if !fn(cur.key, cur.value) {
			return
		}
		cur = cur.next[0]
	}
}

// Keys returns all keys in ascending order.
func (s *SkipList) Keys() []string {
	out := make([]string, 0, s.size)
	for cur := s.head.next[0]; cur != nil; cur = cur.next[0] {
		out = append(out, cur.key)
	}
	return out
}
