package skiplist

import (
	"sort"
	"testing"
)

func TestSetGet(t *testing.T) {
	s := New(1)
	for _, k := range []string{"banana", "apple", "cherry"} {
		s.Set(k, k+"!")
	}
	v, ok := s.Get("apple")
	if !ok || v.(string) != "apple!" {
		t.Fatalf("got %v %v", v, ok)
	}
	keys := s.Keys()
	sorted := []string{"apple", "banana", "cherry"}
	if !sort.StringsAreSorted(keys) || len(keys) != 3 {
		t.Fatalf("keys %v want %v", keys, sorted)
	}
}

func TestDelete(t *testing.T) {
	s := New(2)
	s.Set("a", 1)
	s.Set("b", 2)
	if !s.Delete("a") {
		t.Fatal("expected delete")
	}
	if _, ok := s.Get("a"); ok {
		t.Fatal("still present")
	}
	if s.Len() != 1 {
		t.Fatalf("len %d", s.Len())
	}
	if s.Delete("zzz") {
		t.Fatal("delete missing should return false")
	}
}

func TestRange(t *testing.T) {
	s := New(3)
	for _, k := range []string{"a", "b", "c", "d", "e"} {
		s.Set(k, k)
	}
	got := []string{}
	s.Range("b", "d", func(k string, v any) bool {
		got = append(got, k)
		return true
	})
	if len(got) != 2 || got[0] != "b" || got[1] != "c" {
		t.Fatalf("range %v", got)
	}
}

func TestUpdate(t *testing.T) {
	s := New(4)
	s.Set("k", 1)
	s.Set("k", 2)
	v, _ := s.Get("k")
	if v.(int) != 2 {
		t.Fatalf("got %v", v)
	}
	if s.Len() != 1 {
		t.Fatalf("len %d", s.Len())
	}
}
