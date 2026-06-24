package labelstore

import (
	"sort"
	"testing"
)

func TestIntern(t *testing.T) {
	s := New(0)
	a, _ := s.Intern(map[string]string{"app": "x", "env": "prod"})
	b, _ := s.Intern(map[string]string{"env": "prod", "app": "x"})
	if a != b {
		t.Fatalf("not deduped")
	}
	c, _ := s.Intern(map[string]string{"app": "y"})
	if c == a {
		t.Fatalf("expected new id")
	}
}

func TestCardinalityLimit(t *testing.T) {
	s := New(2)
	_, _ = s.Intern(map[string]string{"a": "1"})
	_, _ = s.Intern(map[string]string{"a": "2"})
	if _, err := s.Intern(map[string]string{"a": "3"}); err == nil {
		t.Fatal("expected limit error")
	}
}

func TestLookup(t *testing.T) {
	s := New(0)
	id, _ := s.Intern(map[string]string{"k": "v"})
	set, ok := s.Lookup(id)
	if !ok {
		t.Fatal("not found")
	}
	v, _ := set.Get("k")
	if v != "v" {
		t.Fatalf("got %q", v)
	}
	got := []string{}
	set.Each(func(k, v string) { got = append(got, k+"="+v) })
	sort.Strings(got)
	if got[0] != "k=v" {
		t.Fatalf("each %v", got)
	}
}

func TestSnapshot(t *testing.T) {
	s := New(0)
	_, _ = s.Intern(map[string]string{"a": "1"})
	_, _ = s.Intern(map[string]string{"b": "2"})
	if len(s.Snapshot()) != 2 {
		t.Fatal("snapshot len")
	}
}
