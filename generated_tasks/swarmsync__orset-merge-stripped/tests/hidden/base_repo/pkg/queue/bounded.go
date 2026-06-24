package queue

import "sync"

// BoundedQueue is a fixed-capacity FIFO queue implemented as a ring buffer.
// It supports concurrent access and drops the oldest item when full.
type BoundedQueue struct {
	mu       sync.Mutex
	items    []interface{}
	head     int
	tail     int
	count    int
	capacity int
	dropped  uint64
}

// NewBoundedQueue creates a queue with the given capacity.
func NewBoundedQueue(capacity int) *BoundedQueue {
	if capacity < 1 {
		capacity = 1
	}
	return &BoundedQueue{
		items:    make([]interface{}, capacity),
		capacity: capacity,
	}
}

// Enqueue adds an item. If full, returns false and drops the item.
func (q *BoundedQueue) Enqueue(item interface{}) bool {
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.count == q.capacity {
		q.dropped++
		return false
	}
	q.items[q.tail] = item
	q.tail = (q.tail + 1) % q.capacity
	q.count++
	return true
}

// EnqueueForce adds an item. If full, overwrites the oldest item.
func (q *BoundedQueue) EnqueueForce(item interface{}) {
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.count == q.capacity {
		q.head = (q.head + 1) % q.capacity
		q.dropped++
	} else {
		q.count++
	}
	q.items[q.tail] = item
	q.tail = (q.tail + 1) % q.capacity
}

// Dequeue removes and returns the oldest item, or (nil, false) if empty.
func (q *BoundedQueue) Dequeue() (interface{}, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.count == 0 {
		return nil, false
	}
	item := q.items[q.head]
	q.items[q.head] = nil
	q.head = (q.head + 1) % q.capacity
	q.count--
	return item, true
}

// PeekFront returns the oldest item without removing it.
func (q *BoundedQueue) PeekFront() (interface{}, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.count == 0 {
		return nil, false
	}
	return q.items[q.head], true
}

// Len returns the current number of items.
func (q *BoundedQueue) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.count
}

// Capacity returns the maximum capacity.
func (q *BoundedQueue) Capacity() int {
	return q.capacity
}

// IsFull returns true if the queue is at capacity.
func (q *BoundedQueue) IsFull() bool {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.count == q.capacity
}

// Dropped returns the number of items that were dropped or overwritten.
func (q *BoundedQueue) Dropped() uint64 {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.dropped
}

// DrainAll returns all items in FIFO order and clears the queue.
func (q *BoundedQueue) DrainAll() []interface{} {
	q.mu.Lock()
	defer q.mu.Unlock()
	result := make([]interface{}, 0, q.count)
	for q.count > 0 {
		result = append(result, q.items[q.head])
		q.items[q.head] = nil
		q.head = (q.head + 1) % q.capacity
		q.count--
	}
	return result
}

// Clear removes all items.
func (q *BoundedQueue) Clear() {
	q.mu.Lock()
	defer q.mu.Unlock()
	for i := range q.items {
		q.items[i] = nil
	}
	q.head = 0
	q.tail = 0
	q.count = 0
}
