package lru

import "testing"

func TestCache_Basic(t *testing.T) {
	c := NewCache(3)
	c.Put("a", 1)
	c.Put("b", 2)
	c.Put("c", 3)
	v, ok := c.Get("b")
	if !ok || v.(int) != 2 {
		t.Fatal("should find b")
	}
}

func TestCache_Eviction(t *testing.T) {
	c := NewCache(2)
	c.Put("a", 1)
	c.Put("b", 2)
	c.Put("c", 3)
	_, ok := c.Get("a")
	if ok {
		t.Fatal("a should be evicted")
	}
	if c.Len() != 2 {
		t.Fatal("len should be 2")
	}
}

func TestCache_LRUOrder(t *testing.T) {
	c := NewCache(2)
	c.Put("a", 1)
	c.Put("b", 2)
	c.Get("a")
	c.Put("c", 3)
	_, ok := c.Get("b")
	if ok {
		t.Fatal("b should be evicted (a was used more recently)")
	}
}

func TestCache_Update(t *testing.T) {
	c := NewCache(2)
	c.Put("a", 1)
	c.Put("a", 2)
	v, _ := c.Get("a")
	if v.(int) != 2 {
		t.Fatal("should be updated")
	}
	if c.Len() != 1 {
		t.Fatal("should not grow")
	}
}

func TestCache_Delete(t *testing.T) {
	c := NewCache(5)
	c.Put("a", 1)
	if !c.Delete("a") {
		t.Fatal("should succeed")
	}
	if c.Delete("a") {
		t.Fatal("should fail second time")
	}
}

func TestCache_Keys(t *testing.T) {
	c := NewCache(5)
	c.Put("a", 1)
	c.Put("b", 2)
	c.Put("c", 3)
	c.Get("a")
	keys := c.Keys()
	if keys[0] != "a" {
		t.Fatal("most recent should be first")
	}
}

func TestCache_Contains(t *testing.T) {
	c := NewCache(2)
	c.Put("a", 1)
	if !c.Contains("a") {
		t.Fatal("should contain a")
	}
	if c.Contains("b") {
		t.Fatal("should not contain b")
	}
}

func TestCache_Peek(t *testing.T) {
	c := NewCache(2)
	c.Put("a", 1)
	c.Put("b", 2)
	v, ok := c.Peek("a")
	if !ok || v.(int) != 1 {
		t.Fatal("peek should work")
	}
	c.Put("c", 3)
	_, ok = c.Get("a")
	if ok {
		t.Fatal("peek should not update recency")
	}
}

func TestCache_Stats(t *testing.T) {
	c := NewCache(5)
	c.Put("a", 1)
	c.Get("a")
	c.Get("b")
	hits, misses := c.Stats()
	if hits != 1 || misses != 1 {
		t.Fatalf("expected 1/1, got %d/%d", hits, misses)
	}
}

func TestCache_HitRate(t *testing.T) {
	c := NewCache(5)
	c.Put("a", 1)
	c.Get("a")
	c.Get("a")
	c.Get("b")
	rate := c.HitRate()
	if rate < 0.6 || rate > 0.7 {
		t.Fatalf("expected ~0.66, got %f", rate)
	}
}

func TestCache_Clear(t *testing.T) {
	c := NewCache(5)
	c.Put("a", 1)
	c.Put("b", 2)
	c.Clear()
	if c.Len() != 0 {
		t.Fatal("should be empty")
	}
}

func TestCache_EvictCallback(t *testing.T) {
	evicted := 0
	c := NewCache(1)
	c.WithEvictCallback(func(k string, v interface{}) { evicted++ })
	c.Put("a", 1)
	c.Put("b", 2)
	if evicted != 1 {
		t.Fatalf("expected 1, got %d", evicted)
	}
}

func TestCache_Capacity(t *testing.T) {
	c := NewCache(42)
	if c.Capacity() != 42 {
		t.Fatal("wrong capacity")
	}
}
