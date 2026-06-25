package skiplist

import (
	"math/rand"
	"sync"
)

const maxLevel = 32
const probability = 0.25

type node struct {
	key   string
	value interface{}
	next  []*node
}

// SkipList is a probabilistic sorted data structure with O(log n) operations.
type SkipList struct {
	mu     sync.RWMutex
	head   *node
	level  int
	length int
	rng    *rand.Rand
}

// New creates an empty skip list.
func New(seed int64) *SkipList {
	return &SkipList{
		head:  &node{next: make([]*node, maxLevel)},
		level: 1,
		rng:   rand.New(rand.NewSource(seed)),
	}
}

func (sl *SkipList) randomLevel() int {
	lvl := 1
	for lvl < maxLevel && sl.rng.Float64() < probability { lvl++ }
	return lvl
}

// Insert adds or updates a key-value pair.
func (sl *SkipList) Insert(key string, value interface{}) {
	sl.mu.Lock()
	defer sl.mu.Unlock()
	update := make([]*node, maxLevel)
	current := sl.head
	for i := sl.level - 1; i >= 0; i-- {
		for current.next[i] != nil && current.next[i].key < key { current = current.next[i] }
		update[i] = current
	}
	if current.next[0] != nil && current.next[0].key == key {
		current.next[0].value = value
		return
	}
	newLevel := sl.randomLevel()
	if newLevel > sl.level {
		for i := sl.level; i < newLevel; i++ { update[i] = sl.head }
		sl.level = newLevel
	}
	n := &node{key: key, value: value, next: make([]*node, newLevel)}
	for i := 0; i < newLevel; i++ {
		n.next[i] = update[i].next[i]
		update[i].next[i] = n
	}
	sl.length++
}

// Search returns the value for a key.
func (sl *SkipList) Search(key string) (interface{}, bool) {
	sl.mu.RLock()
	defer sl.mu.RUnlock()
	current := sl.head
	for i := sl.level - 1; i >= 0; i-- {
		for current.next[i] != nil && current.next[i].key < key { current = current.next[i] }
	}
	current = current.next[0]
	if current != nil && current.key == key { return current.value, true }
	return nil, false
}

// Delete removes a key. Returns true if found.
func (sl *SkipList) Delete(key string) bool {
	sl.mu.Lock()
	defer sl.mu.Unlock()
	update := make([]*node, maxLevel)
	current := sl.head
	for i := sl.level - 1; i >= 0; i-- {
		for current.next[i] != nil && current.next[i].key < key { current = current.next[i] }
		update[i] = current
	}
	target := current.next[0]
	if target == nil || target.key != key { return false }
	for i := 0; i < sl.level; i++ {
		if update[i].next[i] != target { break }
		update[i].next[i] = target.next[i]
	}
	for sl.level > 1 && sl.head.next[sl.level-1] == nil { sl.level-- }
	sl.length--
	return true
}

// Len returns the number of entries.
func (sl *SkipList) Len() int {
	sl.mu.RLock()
	defer sl.mu.RUnlock()
	return sl.length
}

// Range returns all key-value pairs where from <= key <= to.
func (sl *SkipList) Range(from, to string) []struct{ Key string; Value interface{} } {
	sl.mu.RLock()
	defer sl.mu.RUnlock()
	var result []struct{ Key string; Value interface{} }
	current := sl.head
	for i := sl.level - 1; i >= 0; i-- {
		for current.next[i] != nil && current.next[i].key < from { current = current.next[i] }
	}
	current = current.next[0]
	for current != nil && current.key <= to {
		result = append(result, struct{ Key string; Value interface{} }{current.key, current.value})
		current = current.next[0]
	}
	return result
}

// Min returns the smallest key.
func (sl *SkipList) Min() (string, interface{}, bool) {
	sl.mu.RLock()
	defer sl.mu.RUnlock()
	if sl.head.next[0] == nil { return "", nil, false }
	n := sl.head.next[0]
	return n.key, n.value, true
}

// Max returns the largest key.
func (sl *SkipList) Max() (string, interface{}, bool) {
	sl.mu.RLock()
	defer sl.mu.RUnlock()
	current := sl.head
	for i := sl.level - 1; i >= 0; i-- {
		for current.next[i] != nil { current = current.next[i] }
	}
	if current == sl.head { return "", nil, false }
	return current.key, current.value, true
}

// Keys returns all keys in sorted order.
func (sl *SkipList) Keys() []string {
	sl.mu.RLock()
	defer sl.mu.RUnlock()
	keys := make([]string, 0, sl.length)
	current := sl.head.next[0]
	for current != nil {
		keys = append(keys, current.key)
		current = current.next[0]
	}
	return keys
}
