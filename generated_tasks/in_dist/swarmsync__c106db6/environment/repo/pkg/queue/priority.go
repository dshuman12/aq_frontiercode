package queue

import "sync"

// Item is a priority queue entry. Lower Priority values are dequeued first (min-heap).
type Item struct {
	Value    interface{}
	Priority int64
	index    int
}

// PriorityQueue is a thread-safe min-heap priority queue.
type PriorityQueue struct {
	mu    sync.Mutex
	items []*Item
}

// NewPriorityQueue creates an empty priority queue.
func NewPriorityQueue() *PriorityQueue {
	return &PriorityQueue{}
}

// Push adds an item with the given priority.
func (pq *PriorityQueue) Push(value interface{}, priority int64) {
	pq.mu.Lock()
	defer pq.mu.Unlock()
	item := &Item{Value: value, Priority: priority, index: len(pq.items)}
	pq.items = append(pq.items, item)
	pq.siftUp(len(pq.items) - 1)
}

// Pop removes and returns the item with the lowest priority.
// Returns nil if the queue is empty.
func (pq *PriorityQueue) Pop() *Item {
	pq.mu.Lock()
	defer pq.mu.Unlock()
	if len(pq.items) == 0 {
		return nil
	}
	top := pq.items[0]
	n := len(pq.items) - 1
	pq.items[0] = pq.items[n]
	pq.items[0].index = 0
	pq.items = pq.items[:n]
	if n > 0 {
		pq.siftDown(0)
	}
	return top
}

// Peek returns the item with the lowest priority without removing it.
func (pq *PriorityQueue) Peek() *Item {
	pq.mu.Lock()
	defer pq.mu.Unlock()
	if len(pq.items) == 0 {
		return nil
	}
	return pq.items[0]
}

// Len returns the number of items.
func (pq *PriorityQueue) Len() int {
	pq.mu.Lock()
	defer pq.mu.Unlock()
	return len(pq.items)
}

// siftUp restores the heap property after insertion.
func (pq *PriorityQueue) siftUp(i int) {
	for i > 0 {
		parent := (i - 1) / 2
		if pq.items[i].Priority >= pq.items[parent].Priority {
			break
		}
		pq.swap(i, parent)
		i = parent
	}
}

// siftDown restores the heap property after removal.
func (pq *PriorityQueue) siftDown(i int) {
	n := len(pq.items)
	for {
		smallest := i
		left := 2*i + 1
		right := 2*i + 2
		if left < n && pq.items[left].Priority < pq.items[smallest].Priority {
			smallest = left
		}
		if right < n && pq.items[right].Priority < pq.items[smallest].Priority {
			smallest = right
		}
		if smallest == i {
			break
		}
		pq.swap(i, smallest)
		i = smallest
	}
}

func (pq *PriorityQueue) swap(i, j int) {
	pq.items[i], pq.items[j] = pq.items[j], pq.items[i]
	pq.items[i].index = i
	pq.items[j].index = j
}

// Drain removes all items and returns them in priority order.
func (pq *PriorityQueue) Drain() []*Item {
	var result []*Item
	for {
		item := pq.Pop()
		if item == nil {
			break
		}
		result = append(result, item)
	}
	return result
}