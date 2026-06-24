package iter

import "testing"

func TestMapFilter(t *testing.T) {
	seq := FromSlice([]int{1, 2, 3, 4})
	doubled := Map(seq, func(v int) int { return v * 2 })
	even := Filter(doubled, func(v int) bool { return v%4 == 0 })
	out := ToSlice(even)
	if len(out) != 2 || out[0] != 4 || out[1] != 8 {
		t.Fatalf("got %v", out)
	}
}

func TestTakeDrop(t *testing.T) {
	seq := FromSlice([]int{1, 2, 3, 4, 5})
	got := ToSlice(Take(Drop(seq, 2), 2))
	if len(got) != 2 || got[0] != 3 || got[1] != 4 {
		t.Fatalf("got %v", got)
	}
}

func TestConcatReduce(t *testing.T) {
	a := FromSlice([]int{1, 2})
	b := FromSlice([]int{3, 4})
	got := Reduce(Concat(a, b), 0, func(acc, v int) int { return acc + v })
	if got != 10 {
		t.Fatalf("got %d", got)
	}
}

func TestCountFindFirst(t *testing.T) {
	seq := FromSlice([]int{5, 2, 7, 9})
	if Count(FromSlice([]int{5, 2, 7, 9})) != 4 {
		t.Fatal("count")
	}
	v, ok := Find(seq, func(v int) bool { return v > 6 })
	if !ok || v != 7 {
		t.Fatalf("got %v %v", v, ok)
	}
	if _, err := First(FromSlice([]int{})); err != ErrEmpty {
		t.Fatal("expected ErrEmpty")
	}
}

func TestWindow(t *testing.T) {
	seq := FromSlice([]int{1, 2, 3, 4, 5})
	got := ToSlice(Window(seq, 2))
	if len(got) != 3 || got[2][0] != 5 {
		t.Fatalf("got %v", got)
	}
}

func TestSort(t *testing.T) {
	seq := FromSlice([]int{3, 1, 2})
	sorted := ToSlice(Sort(seq, func(a, b int) bool { return a < b }))
	if sorted[0] != 1 || sorted[2] != 3 {
		t.Fatalf("got %v", sorted)
	}
}
