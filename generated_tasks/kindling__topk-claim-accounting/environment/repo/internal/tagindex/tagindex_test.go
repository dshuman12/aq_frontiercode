package tagindex

import "testing"

func TestAddLookup(t *testing.T) {
	idx := New()
	idx.Add(1, "alpha", "beta")
	idx.Add(2, "beta")
	idx.Add(3, "alpha", "gamma")
	if len(idx.Lookup("alpha")) != 2 {
		t.Fatalf("alpha %v", idx.Lookup("alpha"))
	}
	if len(idx.Lookup("beta")) != 2 {
		t.Fatalf("beta %v", idx.Lookup("beta"))
	}
	if len(idx.Lookup("missing")) != 0 {
		t.Fatal("expected empty")
	}
}

func TestIntersectUnion(t *testing.T) {
	idx := New()
	idx.Add(1, "a", "b")
	idx.Add(2, "a")
	idx.Add(3, "b")
	if got := idx.Intersect("a", "b"); len(got) != 1 || got[0] != 1 {
		t.Fatalf("got %v", got)
	}
	if got := idx.Union("a", "b"); len(got) != 3 {
		t.Fatalf("got %v", got)
	}
}

func TestRemove(t *testing.T) {
	idx := New()
	idx.Add(1, "x")
	idx.Add(2, "x")
	idx.Remove(1)
	if got := idx.Lookup("x"); len(got) != 1 || got[0] != 2 {
		t.Fatalf("got %v", got)
	}
}

func TestDifference(t *testing.T) {
	idx := New()
	idx.Add(1, "in")
	idx.Add(2, "in", "out")
	idx.Add(3, "in")
	got := idx.Difference([]string{"in"}, []string{"out"})
	if len(got) != 2 || got[0] != 1 || got[1] != 3 {
		t.Fatalf("got %v", got)
	}
}

func TestCardinalityCount(t *testing.T) {
	idx := New()
	idx.Add(1, "a")
	idx.Add(2, "a")
	idx.Add(3, "b")
	if idx.Cardinality("a") != 2 {
		t.Fatalf("card %d", idx.Cardinality("a"))
	}
	if idx.Count() != 3 {
		t.Fatalf("count %d", idx.Count())
	}
}

func TestTagsSorted(t *testing.T) {
	idx := New()
	idx.Add(1, "z", "a", "m")
	got := idx.Tags()
	if got[0] != "a" || got[2] != "z" {
		t.Fatalf("tags %v", got)
	}
}

func TestNoDup(t *testing.T) {
	idx := New()
	idx.Add(1, "x")
	idx.Add(1, "x")
	if idx.Cardinality("x") != 1 {
		t.Fatalf("dup not deduped")
	}
}
