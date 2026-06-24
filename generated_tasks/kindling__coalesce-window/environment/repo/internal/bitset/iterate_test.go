package bitset

import "testing"

func TestFromInts(t *testing.T) {
	b := FromInts([]int{1, 4, 9})
	if !b.Get(1) || !b.Get(4) || !b.Get(9) {
		t.Fatal("missing bits")
	}
}

func TestToIntsEqual(t *testing.T) {
	a := FromInts([]int{2, 3, 5})
	c := FromInts([]int{2, 3, 5})
	if !a.Equal(c) {
		t.Fatal("expected equal")
	}
	d := FromInts([]int{2, 3, 6})
	if a.Equal(d) {
		t.Fatal("expected unequal")
	}
}

func TestDifference(t *testing.T) {
	a := FromInts([]int{1, 2, 3})
	c := FromInts([]int{2, 3, 4})
	if got := a.Difference(c).ToInts(); len(got) != 1 || got[0] != 1 {
		t.Fatalf("diff %v", got)
	}
	if got := a.SymmetricDifference(c).Count(); got != 2 {
		t.Fatalf("symdiff count %d", got)
	}
}

func TestAnyClone(t *testing.T) {
	b := New(64)
	if b.Any() {
		t.Fatal("expected empty")
	}
	b.Set(3)
	if !b.Any() {
		t.Fatal("expected any")
	}
	c := b.Clone()
	c.Clear(3)
	if !b.Get(3) {
		t.Fatal("clone affected source")
	}
}
