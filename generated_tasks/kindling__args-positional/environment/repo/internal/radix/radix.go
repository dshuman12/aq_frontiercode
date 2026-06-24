// Package radix is a byte-keyed prefix index used by the cache.
package radix

import "sync"

// Trie is a thread-safe byte-keyed prefix index.
type Trie struct {
	mu   sync.RWMutex
	root *node
}

type node struct {
	children map[byte]*node
	count    uint32
}

func newNode() *node {
	return &node{children: map[byte]*node{}}
}

// New returns an empty trie.
func New() *Trie { return &Trie{root: newNode()} }

// Insert adds key.
func (t *Trie) Insert(key []byte) {
	t.mu.Lock()
	defer t.mu.Unlock()
	n := t.root
	for _, b := range key {
		c, ok := n.children[b]
		if !ok {
			c = newNode()
			n.children[b] = c
		}
		n = c
	}
	n.count++
}

// CountWithPrefix returns the total number of inserted keys
// starting with prefix.
func (t *Trie) CountWithPrefix(prefix []byte) uint32 {
	t.mu.RLock()
	defer t.mu.RUnlock()
	n := t.root
	for _, b := range prefix {
		c, ok := n.children[b]
		if !ok {
			return 0
		}
		n = c
	}
	return sumCounts(n)
}

// HasPrefix reports whether at least one key matches.
func (t *Trie) HasPrefix(prefix []byte) bool {
	return t.CountWithPrefix(prefix) > 0
}

// Total returns the total number of inserted keys.
func (t *Trie) Total() uint32 {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return sumCounts(t.root)
}

func sumCounts(n *node) uint32 {
	total := n.count
	for _, c := range n.children {
		total += sumCounts(c)
	}
	return total
}
