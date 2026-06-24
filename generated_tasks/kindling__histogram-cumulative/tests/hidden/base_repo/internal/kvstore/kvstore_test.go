package kvstore

import (
	"context"
	"testing"
	"time"
)

func TestSetGet(t *testing.T) {
	s := New()
	s.Set("k", "v", 0)
	v, ok := s.Get("k")
	if !ok || v.(string) != "v" {
		t.Fatalf("got %v %v", v, ok)
	}
}

func TestExpiry(t *testing.T) {
	s := New()
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	s.SetClock(func() time.Time { return now })
	s.Set("k", "v", time.Second)
	now = now.Add(2 * time.Second)
	if _, ok := s.Get("k"); ok {
		t.Fatal("expected expired")
	}
	if s.Stats().Expires < 1 {
		t.Fatalf("stats %+v", s.Stats())
	}
}

func TestSweep(t *testing.T) {
	s := New()
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	s.SetClock(func() time.Time { return now })
	s.Set("a", 1, time.Second)
	s.Set("b", 2, 0)
	now = now.Add(2 * time.Second)
	if s.Sweep() != 1 {
		t.Fatal("expected one swept")
	}
	if s.Len() != 1 {
		t.Fatalf("len %d", s.Len())
	}
}

func TestKeysSorted(t *testing.T) {
	s := New()
	for _, k := range []string{"c", "a", "b"} {
		s.Set(k, k, 0)
	}
	keys := s.Keys()
	if keys[0] != "a" || keys[2] != "c" {
		t.Fatalf("got %v", keys)
	}
}

func TestRunSweeperCancellable(t *testing.T) {
	s := New()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	s.RunSweeper(ctx, 10*time.Millisecond)
}

func TestDelete(t *testing.T) {
	s := New()
	s.Set("k", 1, 0)
	s.Delete("k")
	if _, ok := s.Get("k"); ok {
		t.Fatal("not deleted")
	}
}
