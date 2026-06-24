// Package blockcache caches fixed-size on-disk blocks in memory using a
// segmented LRU. Used by the index reader to amortise open() costs when
// many lookups land on the same backing file.
package blockcache

import (
	"container/list"
	"sync"
)

// Key uniquely identifies a block.
type Key struct {
	File   string
	Offset int64
}

// Block is one cached payload.
type Block struct {
	Key  Key
	Data []byte
}

// Cache is a thread-safe LRU.
type Cache struct {
	mu       sync.Mutex
	cap      int
	bytes    int
	maxBytes int
	ll       *list.List
	idx      map[Key]*list.Element
}

// New constructs a Cache. maxBytes 0 disables byte-budget enforcement
// (only count cap applies).
func New(cap, maxBytes int) *Cache {
	if cap <= 0 {
		cap = 64
	}
	return &Cache{
		cap:      cap,
		maxBytes: maxBytes,
		ll:       list.New(),
		idx:      map[Key]*list.Element{},
	}
}

// Get returns the cached block, marking it as recently used.
func (c *Cache) Get(k Key) (*Block, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if e, ok := c.idx[k]; ok {
		c.ll.MoveToFront(e)
		return e.Value.(*Block), true
	}
	return nil, false
}

// Put inserts blk, evicting the least-recently-used entries as needed.
func (c *Cache) Put(blk *Block) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if e, ok := c.idx[blk.Key]; ok {
		c.bytes -= len(e.Value.(*Block).Data)
		c.bytes += len(blk.Data)
		e.Value = blk
		c.ll.MoveToFront(e)
		c.evictLocked()
		return
	}
	e := c.ll.PushFront(blk)
	c.idx[blk.Key] = e
	c.bytes += len(blk.Data)
	c.evictLocked()
}

// Len returns the number of cached blocks.
func (c *Cache) Len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.ll.Len()
}

// Bytes returns the total bytes currently held.
func (c *Cache) Bytes() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.bytes
}

func (c *Cache) evictLocked() {
	for c.ll.Len() > c.cap || (c.maxBytes > 0 && c.bytes > c.maxBytes) {
		back := c.ll.Back()
		if back == nil {
			return
		}
		blk := back.Value.(*Block)
		c.bytes -= len(blk.Data)
		c.ll.Remove(back)
		delete(c.idx, blk.Key)
	}
}

// Purge clears all entries.
func (c *Cache) Purge() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.ll.Init()
	c.idx = map[Key]*list.Element{}
	c.bytes = 0
}
