package lru

import (
	"container/list"
	"sync"
)

type entry struct {
	key   string
	value interface{}
}

// Cache is a thread-safe LRU cache with fixed capacity.
type Cache struct {
	mu       sync.Mutex
	capacity int
	items    map[string]*list.Element
	order    *list.List
	onEvict  func(key string, value interface{})
	hits     uint64
	misses   uint64
}

// NewCache creates an LRU cache with the given capacity.
func NewCache(capacity int) *Cache {
	if capacity < 1 {
		capacity = 1
	}
	return &Cache{capacity: capacity, items: make(map[string]*list.Element), order: list.New()}
}

// WithEvictCallback sets a function called when entries are evicted.
func (c *Cache) WithEvictCallback(fn func(string, interface{})) *Cache {
	c.onEvict = fn
	return c
}

// Get retrieves a value and moves it to the front (most recent).
func (c *Cache) Get(key string) (interface{}, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if elem, ok := c.items[key]; ok {
		c.order.MoveToFront(elem)
		c.hits++
		return elem.Value.(*entry).value, true
	}
	c.misses++
	return nil, false
}

// Put adds or updates a key-value pair.
func (c *Cache) Put(key string, value interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if elem, ok := c.items[key]; ok {
		c.order.MoveToFront(elem)
		elem.Value.(*entry).value = value
		return
	}
	if c.order.Len() >= c.capacity {
		c.evictOldest()
	}
	elem := c.order.PushFront(&entry{key: key, value: value})
	c.items[key] = elem
}

// Delete removes a key.
func (c *Cache) Delete(key string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if elem, ok := c.items[key]; ok {
		c.removeElement(elem)
		return true
	}
	return false
}

// Len returns the number of entries.
func (c *Cache) Len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.order.Len()
}

// Capacity returns the maximum capacity.
func (c *Cache) Capacity() int { return c.capacity }

// Keys returns all keys from most to least recently used.
func (c *Cache) Keys() []string {
	c.mu.Lock()
	defer c.mu.Unlock()
	keys := make([]string, 0, c.order.Len())
	for e := c.order.Front(); e != nil; e = e.Next() {
		keys = append(keys, e.Value.(*entry).key)
	}
	return keys
}

// Contains checks if a key exists without updating recency.
func (c *Cache) Contains(key string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	_, ok := c.items[key]
	return ok
}

// Peek returns a value without updating recency.
func (c *Cache) Peek(key string) (interface{}, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if elem, ok := c.items[key]; ok {
		return elem.Value.(*entry).value, true
	}
	return nil, false
}

// Stats returns hit and miss counts.
func (c *Cache) Stats() (hits, misses uint64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.hits, c.misses
}

// HitRate returns the cache hit rate (0.0 to 1.0).
func (c *Cache) HitRate() float64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	total := c.hits + c.misses
	if total == 0 {
		return 0
	}
	return float64(c.hits) / float64(total)
}

// Clear removes all entries.
func (c *Cache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]*list.Element)
	c.order.Init()
}

func (c *Cache) evictOldest() {
	back := c.order.Back()
	if back == nil {
		return
	}
	c.removeElement(back)
}

func (c *Cache) removeElement(elem *list.Element) {
	c.order.Remove(elem)
	e := elem.Value.(*entry)
	delete(c.items, e.key)
	if c.onEvict != nil {
		c.onEvict(e.key, e.value)
	}
}
