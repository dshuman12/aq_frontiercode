// Package avltree implements an AVL self-balancing binary search tree
// keyed by string. AVL trees keep height tightly bounded to log2(n)+1.5
// so range queries and ordered iteration are O(log n + k).
package avltree

import (
	"sort"
	"strings"
)

// Tree is an AVL tree of string keys.
type Tree struct {
	root *node
	size int
}

type node struct {
	key    string
	value  any
	height int
	left   *node
	right  *node
}

// New constructs an empty Tree.
func New() *Tree { return &Tree{} }

// Len returns the number of stored keys.
func (t *Tree) Len() int { return t.size }

// Set inserts or updates key.
func (t *Tree) Set(key string, value any) {
	created := false
	t.root, created = insert(t.root, key, value)
	if created {
		t.size++
	}
}

func insert(n *node, key string, value any) (*node, bool) {
	if n == nil {
		return &node{key: key, value: value, height: 1}, true
	}
	cmp := strings.Compare(key, n.key)
	if cmp == 0 {
		n.value = value
		return n, false
	}
	created := false
	if cmp < 0 {
		n.left, created = insert(n.left, key, value)
	} else {
		n.right, created = insert(n.right, key, value)
	}
	n.height = 1 + max(height(n.left), height(n.right))
	return rebalance(n), created
}

// Get returns the value for key.
func (t *Tree) Get(key string) (any, bool) {
	cur := t.root
	for cur != nil {
		cmp := strings.Compare(key, cur.key)
		switch {
		case cmp == 0:
			return cur.value, true
		case cmp < 0:
			cur = cur.left
		default:
			cur = cur.right
		}
	}
	return nil, false
}

// Has reports whether key exists.
func (t *Tree) Has(key string) bool {
	_, ok := t.Get(key)
	return ok
}

// Delete removes key.
func (t *Tree) Delete(key string) bool {
	var removed bool
	t.root, removed = remove(t.root, key)
	if removed {
		t.size--
	}
	return removed
}

func remove(n *node, key string) (*node, bool) {
	if n == nil {
		return nil, false
	}
	cmp := strings.Compare(key, n.key)
	var removed bool
	switch {
	case cmp < 0:
		n.left, removed = remove(n.left, key)
	case cmp > 0:
		n.right, removed = remove(n.right, key)
	default:
		removed = true
		if n.left == nil {
			return n.right, true
		}
		if n.right == nil {
			return n.left, true
		}
		min := minNode(n.right)
		n.key = min.key
		n.value = min.value
		n.right, _ = remove(n.right, min.key)
	}
	n.height = 1 + max(height(n.left), height(n.right))
	return rebalance(n), removed
}

func minNode(n *node) *node {
	for n.left != nil {
		n = n.left
	}
	return n
}

// Min returns the smallest key.
func (t *Tree) Min() (string, any, bool) {
	if t.root == nil {
		return "", nil, false
	}
	n := minNode(t.root)
	return n.key, n.value, true
}

// Max returns the largest key.
func (t *Tree) Max() (string, any, bool) {
	if t.root == nil {
		return "", nil, false
	}
	n := t.root
	for n.right != nil {
		n = n.right
	}
	return n.key, n.value, true
}

// Range invokes fn for every key in [lo, hi).
func (t *Tree) Range(lo, hi string, fn func(key string, value any) bool) {
	var rangeFn func(n *node) bool
	rangeFn = func(n *node) bool {
		if n == nil {
			return true
		}
		if strings.Compare(lo, n.key) <= 0 {
			if !rangeFn(n.left) {
				return false
			}
		}
		if strings.Compare(n.key, lo) >= 0 && (hi == "" || strings.Compare(n.key, hi) < 0) {
			if !fn(n.key, n.value) {
				return false
			}
		}
		if hi == "" || strings.Compare(hi, n.key) > 0 {
			if !rangeFn(n.right) {
				return false
			}
		}
		return true
	}
	rangeFn(t.root)
}

// Keys returns all keys sorted.
func (t *Tree) Keys() []string {
	var out []string
	t.Range("", "", func(k string, _ any) bool {
		out = append(out, k)
		return true
	})
	sort.Strings(out)
	return out
}

// Height returns the tree's height (0 for empty).
func (t *Tree) Height() int { return height(t.root) }

func height(n *node) int {
	if n == nil {
		return 0
	}
	return n.height
}

func balance(n *node) int {
	if n == nil {
		return 0
	}
	return height(n.left) - height(n.right)
}

func rotateLeft(n *node) *node {
	r := n.right
	n.right = r.left
	r.left = n
	n.height = 1 + max(height(n.left), height(n.right))
	r.height = 1 + max(height(r.left), height(r.right))
	return r
}

func rotateRight(n *node) *node {
	l := n.left
	n.left = l.right
	l.right = n
	n.height = 1 + max(height(n.left), height(n.right))
	l.height = 1 + max(height(l.left), height(l.right))
	return l
}

func rebalance(n *node) *node {
	bf := balance(n)
	switch {
	case bf > 1 && balance(n.left) >= 0:
		return rotateRight(n)
	case bf > 1 && balance(n.left) < 0:
		n.left = rotateLeft(n.left)
		return rotateRight(n)
	case bf < -1 && balance(n.right) <= 0:
		return rotateLeft(n)
	case bf < -1 && balance(n.right) > 0:
		n.right = rotateRight(n.right)
		return rotateLeft(n)
	}
	return n
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
