// Package heap implements a generic binary heap.
package heap

// Order selects min or max ordering.
type Order int

const (
	Min Order = iota
	Max
)

// Heap is a generic binary heap.
type Heap[T any] struct {
	items []T
	less  func(a, b T) bool
	order Order
}

// New returns an empty heap.
func New[T any](order Order, lessMin func(a, b T) bool) *Heap[T] {
	return &Heap[T]{less: lessMin, order: order}
}

// Len returns the number of items.
func (h *Heap[T]) Len() int { return len(h.items) }

// Push inserts an item.
func (h *Heap[T]) Push(v T) {
	h.items = append(h.items, v)
	h.siftUp(len(h.items) - 1)
}

// Pop removes and returns the root.
func (h *Heap[T]) Pop() (T, bool) {
	var zero T
	if len(h.items) == 0 {
		return zero, false
	}
	root := h.items[0]
	last := len(h.items) - 1
	h.items[0] = h.items[last]
	h.items = h.items[:last]
	if len(h.items) > 0 {
		h.siftDown(0)
	}
	return root, true
}

// Peek returns the root without popping.
func (h *Heap[T]) Peek() (T, bool) {
	var zero T
	if len(h.items) == 0 {
		return zero, false
	}
	return h.items[0], true
}

func (h *Heap[T]) better(a, b T) bool {
	if h.order == Min {
		return h.less(a, b)
	}
	return h.less(b, a)
}

func (h *Heap[T]) siftUp(idx int) {
	for idx > 0 {
		parent := (idx - 1) / 2
		if h.better(h.items[idx], h.items[parent]) {
			h.items[idx], h.items[parent] = h.items[parent], h.items[idx]
			idx = parent
		} else {
			break
		}
	}
}

func (h *Heap[T]) siftDown(idx int) {
	n := len(h.items)
	for {
		l, r := 2*idx+1, 2*idx+2
		best := idx
		if l < n && h.better(h.items[l], h.items[best]) {
			best = l
		}
		if r < n && h.better(h.items[r], h.items[best]) {
			best = r
		}
		if best == idx {
			return
		}
		h.items[idx], h.items[best] = h.items[best], h.items[idx]
		idx = best
	}
}
