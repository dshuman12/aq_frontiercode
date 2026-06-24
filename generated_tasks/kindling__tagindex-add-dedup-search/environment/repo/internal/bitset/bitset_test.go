package bitset

import "testing"

func TestSetGet(t *testing.T) {
	b := New(0)
	b.Set(7)
	b.Set(70)
	if !b.Get(7) || !b.Get(70) {
		t.Fatal("get failed")
	}
	if b.Get(8) {
		t.Fatal("expected false")
	}
	b.Clear(7)
	if b.Get(7) {
		t.Fatal("clear failed")
	}
}

func TestCount(t *testing.T) {
	b := New(128)
	for _, i := range []int{1, 5, 64, 100} {
		b.Set(i)
	}
	if b.Count() != 4 {
		t.Fatalf("count %d", b.Count())
	}
}

func TestUnionIntersect(t *testing.T) {
	a, c := New(64), New(64)
	a.Set(1)
	a.Set(2)
	c.Set(2)
	c.Set(3)
	if a.Union(c).Count() != 3 {
		t.Fatal("union")
	}
	if a.Intersect(c).Count() != 1 {
		t.Fatal("intersect")
	}
}

func TestEach(t *testing.T) {
	b := New(0)
	for _, i := range []int{2, 5, 9, 100} {
		b.Set(i)
	}
	got := []int{}
	b.Each(func(i int) bool { got = append(got, i); return true })
	if len(got) != 4 || got[0] != 2 || got[3] != 100 {
		t.Fatalf("each %v", got)
	}
}
