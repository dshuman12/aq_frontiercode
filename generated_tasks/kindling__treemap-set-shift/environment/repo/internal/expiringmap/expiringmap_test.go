package expiringmap

import (
	"testing"
	"time"
)

func TestSetGet(t *testing.T) {
	m := New()
	m.Set("k", "v", time.Hour)
	if v, ok := m.Get("k"); !ok || v.(string) != "v" {
		t.Fatalf("got %v %v", v, ok)
	}
}

func TestExpire(t *testing.T) {
	m := New()
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	m.SetClock(func() time.Time { return now })
	m.Set("k", "v", time.Second)
	now = now.Add(2 * time.Second)
	if _, ok := m.Get("k"); ok {
		t.Fatal("expected expired")
	}
}

func TestSweep(t *testing.T) {
	m := New()
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	m.SetClock(func() time.Time { return now })
	for i := 0; i < 5; i++ {
		m.Set("k"+string(rune('0'+i)), i, time.Second)
	}
	now = now.Add(2 * time.Second)
	if m.Sweep() != 5 {
		t.Fatal("sweep")
	}
}

func TestUpdate(t *testing.T) {
	m := New()
	m.Set("k", 1, time.Hour)
	m.Set("k", 2, time.Hour)
	v, _ := m.Get("k")
	if v.(int) != 2 {
		t.Fatalf("got %v", v)
	}
	if m.Len() != 1 {
		t.Fatalf("len %d", m.Len())
	}
}

func TestDelete(t *testing.T) {
	m := New()
	m.Set("k", 1, time.Hour)
	m.Delete("k")
	if _, ok := m.Get("k"); ok {
		t.Fatal("not deleted")
	}
}

func TestNextExpiry(t *testing.T) {
	m := New()
	if _, ok := m.NextExpiry(); ok {
		t.Fatal("expected empty")
	}
	m.Set("k", "v", time.Hour)
	if _, ok := m.NextExpiry(); !ok {
		t.Fatal("expected entry")
	}
}
