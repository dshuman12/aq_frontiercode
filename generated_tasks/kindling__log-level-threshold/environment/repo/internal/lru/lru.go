// Package lru implements a doubly-linked-list LRU cache.
package lru

import "sync"

// Cache is a thread-safe LRU cache keyed by string.
type Cache struct {
	mu       sync.Mutex
	capacity int
	items    map[string]*node
	head     *node
	tail     *node
}

type node struct {
	key   string
	value any
	prev  *node
	next  *node
}

// New returns an empty cache with the given capacity.
func New(capacity int) *Cache {
	if capacity < 1 {
		capacity = 1
	}
	return &Cache{capacity: capacity, items: map[string]*node{}}
}

// Len returns the number of items currently held.
func (c *Cache) Len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.items)
}

// Put inserts or refreshes (k, v).
func (c *Cache) Put(k string, v any) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if n, ok := c.items[k]; ok {
		n.value = v
		c.moveToFront(n)
		return
	}
	n := &node{key: k, value: v}
	c.items[k] = n
	c.pushFront(n)
	if len(c.items) > c.capacity {
		c.evictOldest()
	}
}

// Get returns (value, true) if present, refreshing freshness.
func (c *Cache) Get(k string) (any, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	n, ok := c.items[k]
	if !ok {
		return nil, false
	}
	c.moveToFront(n)
	return n.value, true
}

// Remove deletes k. Returns true when it was present.
func (c *Cache) Remove(k string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	n, ok := c.items[k]
	if !ok {
		return false
	}
	c.unlink(n)
	delete(c.items, k)
	return true
}

func (c *Cache) moveToFront(n *node) {
	c.unlink(n)
	c.pushFront(n)
}

func (c *Cache) pushFront(n *node) {
	n.prev = nil
	n.next = c.head
	if c.head != nil {
		c.head.prev = n
	}
	c.head = n
	if c.tail == nil {
		c.tail = n
	}
}

func (c *Cache) unlink(n *node) {
	if n.prev != nil {
		n.prev.next = n.next
	} else {
		c.head = n.next
	}
	if n.next != nil {
		n.next.prev = n.prev
	} else {
		c.tail = n.prev
	}
	n.prev, n.next = nil, nil
}

func (c *Cache) evictOldest() {
	if c.tail == nil {
		return
	}
	delete(c.items, c.tail.key)
	c.unlink(c.tail)
}
