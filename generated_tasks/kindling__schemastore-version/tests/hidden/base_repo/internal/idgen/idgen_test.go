package idgen

import (
	"sort"
	"testing"
	"time"
)

func TestShape(t *testing.T) {
	g := New()
	id := g.Next()
	if err := Validate(id); err != nil {
		t.Fatal(err)
	}
}

func TestSortable(t *testing.T) {
	g := New()
	t0 := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	ids := []string{
		g.At(t0),
		g.At(t0.Add(time.Second)),
		g.At(t0.Add(2 * time.Second)),
	}
	sortedCopy := make([]string, len(ids))
	copy(sortedCopy, ids)
	sort.Strings(sortedCopy)
	for i, v := range ids {
		if sortedCopy[i] != v {
			t.Fatalf("not sorted: %v", ids)
		}
	}
}

func TestUnique(t *testing.T) {
	g := New()
	t0 := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	seen := map[string]bool{}
	for i := 0; i < 100; i++ {
		id := g.At(t0)
		if seen[id] {
			t.Fatalf("dup at %d", i)
		}
		seen[id] = true
	}
}

func TestValidate(t *testing.T) {
	if err := Validate("short"); err == nil {
		t.Fatal("expected err")
	}
	if err := Validate("01234567890123456789ABCDEU"); err == nil {
		t.Fatal("expected err on U")
	}
}
