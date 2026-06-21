package lru

import "testing"

func TestLRU_EvictsLeastRecentlyUsed(t *testing.T) {
	c := NewCache(3)
	c.Put("a", 1)
	c.Put("b", 2)
	c.Put("c", 3)

	// Access "a" and "b" to make "c" the LRU
	c.Get("a")
	c.Get("b")

	// Adding "d" should evict "c" (least recently used)
	c.Put("d", 4)

	if _, ok := c.Get("c"); ok {
		t.Error("'c' should have been evicted as LRU")
	}
	if _, ok := c.Get("a"); !ok {
		t.Error("'a' should still be present (was accessed)")
	}
	if _, ok := c.Get("b"); !ok {
		t.Error("'b' should still be present (was accessed)")
	}
	if _, ok := c.Get("d"); !ok {
		t.Error("'d' should be present (just inserted)")
	}
}

func TestLRU_EvictsFirstInsertedWhenNoneAccessed(t *testing.T) {
	c := NewCache(2)
	c.Put("first", 1)
	c.Put("second", 2)
	c.Put("third", 3) // should evict "first"

	if _, ok := c.Get("first"); ok {
		t.Error("'first' should be evicted")
	}
	if _, ok := c.Get("second"); !ok {
		t.Error("'second' should remain")
	}
}

func TestLRU_PutUpdateRefreshesRecency(t *testing.T) {
	c := NewCache(2)
	c.Put("a", 1)
	c.Put("b", 2)
	// Update "a" via Put — should move "a" to most-recently-used position
	c.Put("a", 99)
	// Adding "c" should evict LRU = "b" (since "a" was just updated)
	c.Put("c", 3)

	if _, ok := c.Get("b"); ok {
		t.Error("'b' should be evicted (it is LRU after 'a' was re-put)")
	}
	if v, ok := c.Get("a"); !ok || v.(int) != 99 {
		t.Error("'a' should still be present with the updated value 99")
	}
	if _, ok := c.Get("c"); !ok {
		t.Error("'c' should be present (just inserted)")
	}
}
