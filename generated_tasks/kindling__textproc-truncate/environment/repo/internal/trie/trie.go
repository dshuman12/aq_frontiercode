// Package trie implements a prefix trie keyed by characters.
package trie

// Trie is a simple character-keyed prefix trie.
type Trie struct {
	root *node
}

type node struct {
	terminal bool
	children map[rune]*node
}

func newNode() *node {
	return &node{children: map[rune]*node{}}
}

// New returns an empty trie.
func New() *Trie {
	return &Trie{root: newNode()}
}

// Insert adds a key.
func (t *Trie) Insert(key string) {
	n := t.root
	for _, r := range key {
		c, ok := n.children[r]
		if !ok {
			c = newNode()
			n.children[r] = c
		}
		n = c
	}
	n.terminal = true
}

// Contains reports whether key was inserted.
func (t *Trie) Contains(key string) bool {
	n := t.root
	for _, r := range key {
		c, ok := n.children[r]
		if !ok {
			return false
		}
		n = c
	}
	return n.terminal
}

// HasPrefixOf returns true when at least one inserted key is a prefix of s.
func (t *Trie) HasPrefixOf(s string) bool {
	n := t.root
	for _, r := range s {
		if n.terminal {
			return true
		}
		c, ok := n.children[r]
		if !ok {
			return false
		}
		n = c
	}
	return n.terminal
}

// IsPrefixOfSome returns true when s is a prefix of at least one stored key.
func (t *Trie) IsPrefixOfSome(s string) bool {
	n := t.root
	for _, r := range s {
		c, ok := n.children[r]
		if !ok {
			return false
		}
		n = c
	}
	return true
}

// Len returns the number of distinct stored keys.
func (t *Trie) Len() int { return countTerminals(t.root) }

func countTerminals(n *node) int {
	c := 0
	if n.terminal {
		c++
	}
	for _, ch := range n.children {
		c += countTerminals(ch)
	}
	return c
}
