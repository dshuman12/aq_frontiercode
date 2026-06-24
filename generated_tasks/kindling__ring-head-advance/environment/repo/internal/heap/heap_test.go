package heap_test

import (
	"testing"

	"github.com/dleblanc/kindling/internal/heap"
)

func TestMinHeapPopsSmallest(t *testing.T) {
	h := heap.New[int](heap.Min, func(a, b int) bool { return a < b })
	for _, v := range []int{5, 1, 3, 2, 4} {
		h.Push(v)
	}
	if v, _ := h.Pop(); v != 1 {
		t.Errorf("got %d", v)
	}
	if v, _ := h.Pop(); v != 2 {
		t.Errorf("got %d", v)
	}
}

func TestMaxHeapPopsLargest(t *testing.T) {
	h := heap.New[int](heap.Max, func(a, b int) bool { return a < b })
	for _, v := range []int{5, 1, 3, 2, 4} {
		h.Push(v)
	}
	if v, _ := h.Pop(); v != 5 {
		t.Errorf("got %d", v)
	}
}

func TestPopEmpty(t *testing.T) {
	h := heap.New[int](heap.Min, func(a, b int) bool { return a < b })
	if _, ok := h.Pop(); ok {
		t.Error("expected !ok")
	}
}

func TestPeek(t *testing.T) {
	h := heap.New[int](heap.Min, func(a, b int) bool { return a < b })
	h.Push(7)
	v, _ := h.Peek()
	if v != 7 || h.Len() != 1 {
		t.Errorf("got %d, len=%d", v, h.Len())
	}
}

func TestStrings(t *testing.T) {
	h := heap.New[string](heap.Min, func(a, b string) bool { return a < b })
	for _, s := range []string{"banana", "apple", "cherry"} {
		h.Push(s)
	}
	if v, _ := h.Pop(); v != "apple" {
		t.Errorf("got %q", v)
	}
}
