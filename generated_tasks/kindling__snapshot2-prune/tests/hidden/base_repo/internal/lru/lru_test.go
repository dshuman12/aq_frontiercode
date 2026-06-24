package lru_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/lru"
)

func TestPutGet(t *testing.T) {
	c := lru.New(2)
	c.Put("a", 1)
	c.Put("b", 2)
	if v, ok := c.Get("a"); !ok || v.(int) != 1 {
		t.Errorf("got %v %v", v, ok)
	}
}

func TestEviction(t *testing.T) {
	c := lru.New(2)
	c.Put("a", 1)
	c.Put("b", 2)
	c.Put("c", 3)
	if _, ok := c.Get("a"); ok {
		t.Error("a should have been evicted")
	}
	if c.Len() != 2 {
		t.Errorf("got %d", c.Len())
	}
}

func TestTouchAvoidsEviction(t *testing.T) {
	c := lru.New(2)
	c.Put("a", 1)
	c.Put("b", 2)
	c.Get("a")
	c.Put("c", 3)
	if _, ok := c.Get("b"); ok {
		t.Error("b should have been evicted")
	}
}

func TestUpdateOverwrites(t *testing.T) {
	c := lru.New(2)
	c.Put("a", 1)
	c.Put("a", 99)
	if v, _ := c.Get("a"); v.(int) != 99 {
		t.Errorf("got %v", v)
	}
}

func TestRemove(t *testing.T) {
	c := lru.New(2)
	c.Put("a", 1)
	if !c.Remove("a") {
		t.Error("expected true")
	}
	if c.Remove("missing") {
		t.Error("expected false")
	}
}

func TestZeroCapacityFallsBackToOne(t *testing.T) {
	c := lru.New(0)
	c.Put("a", 1)
	c.Put("b", 2)
	if c.Len() != 1 {
		t.Errorf("got %d", c.Len())
	}
}
