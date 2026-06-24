package ttlmap

import (
	"testing"
	"time"
)

func TestMap_SetGet(t *testing.T) {
	m := New(time.Second)
	m.Set("k", "v")
	v, ok := m.Get("k")
	if !ok || v.(string) != "v" {
		t.Fatal("should get value")
	}
}

func TestMap_Expiration(t *testing.T) {
	m := New(20 * time.Millisecond)
	m.Set("k", "v")
	time.Sleep(30 * time.Millisecond)
	_, ok := m.Get("k")
	if ok {
		t.Fatal("should expire")
	}
}

func TestMap_Delete(t *testing.T) {
	m := New(time.Second)
	m.Set("k", "v")
	if !m.Delete("k") {
		t.Fatal("should return true")
	}
	if m.Delete("k") {
		t.Fatal("should return false for missing")
	}
}

func TestMap_Cleanup(t *testing.T) {
	m := New(10 * time.Millisecond)
	m.Set("a", 1)
	m.Set("b", 2)
	m.Set("c", 3)
	time.Sleep(20 * time.Millisecond)
	removed := m.Cleanup()
	if removed != 3 {
		t.Fatalf("expected 3 removed, got %d", removed)
	}
}

func TestMap_Keys(t *testing.T) {
	m := New(time.Second)
	m.Set("a", 1)
	m.Set("b", 2)
	keys := m.Keys()
	if len(keys) != 2 {
		t.Fatalf("expected 2, got %d", len(keys))
	}
}

func TestMap_Touch(t *testing.T) {
	m := New(50 * time.Millisecond)
	m.Set("k", "v")
	time.Sleep(30 * time.Millisecond)
	m.Touch("k")
	time.Sleep(30 * time.Millisecond)
	_, ok := m.Get("k")
	if !ok {
		t.Fatal("touched key should not expire yet")
	}
}

func TestMap_TTL(t *testing.T) {
	m := New(time.Second)
	m.Set("k", "v")
	ttl, ok := m.TTL("k")
	if !ok {
		t.Fatal("should find key")
	}
	if ttl <= 0 || ttl > time.Second {
		t.Fatalf("unexpected ttl: %v", ttl)
	}
}

func TestMap_CustomTTL(t *testing.T) {
	m := New(time.Hour)
	m.SetWithTTL("k", "v", 10*time.Millisecond)
	time.Sleep(20 * time.Millisecond)
	_, ok := m.Get("k")
	if ok {
		t.Fatal("custom TTL should have expired")
	}
}

func TestMap_EvictCallback(t *testing.T) {
	evicted := 0
	m := New(10 * time.Millisecond)
	m.WithEvictCallback(func(k string, v interface{}) { evicted++ })
	m.Set("a", 1)
	time.Sleep(20 * time.Millisecond)
	m.Cleanup()
	if evicted != 1 {
		t.Fatalf("expected 1 eviction callback, got %d", evicted)
	}
}

func TestMap_Len(t *testing.T) {
	m := New(time.Second)
	m.Set("a", 1)
	m.Set("b", 2)
	if m.Len() != 2 {
		t.Fatal("expected 2")
	}
}
