package queue

import "sync"

// Deque is a double-ended queue that supports work-stealing.
// The owner pushes and pops from the bottom; stealers steal from the top.
type Deque struct {
	mu    sync.Mutex
	items []interface{}
}

// NewDeque creates an empty deque.
func NewDeque() *Deque {
	return &Deque{}
}

// PushBottom adds an item to the bottom (owner side).
func (d *Deque) PushBottom(item interface{}) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.items = append(d.items, item)
}

// PopBottom removes and returns the item from the bottom (owner side).
// Returns (nil, false) if empty.
func (d *Deque) PopBottom() (interface{}, bool) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if len(d.items) == 0 {
		return nil, false
	}
	n := len(d.items) - 1
	item := d.items[n]
	d.items[n] = nil
	d.items = d.items[:n]
	return item, true
}

// StealTop removes and returns the item from the top (stealer side).
// Returns (nil, false) if empty.
func (d *Deque) StealTop() (interface{}, bool) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if len(d.items) == 0 {
		return nil, false
	}
	item := d.items[0]
	d.items[0] = nil
	d.items = d.items[1:]
	return item, true
}

// Len returns the number of items.
func (d *Deque) Len() int {
	d.mu.Lock()
	defer d.mu.Unlock()
	return len(d.items)
}

// IsEmpty returns true if the deque has no items.
func (d *Deque) IsEmpty() bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	return len(d.items) == 0
}

// WorkStealingPool manages a set of deques, one per worker.
// Workers push/pop on their own deque; idle workers steal from others.
type WorkStealingPool struct {
	mu     sync.RWMutex
	deques map[string]*Deque
	stolen uint64
}

// NewWorkStealingPool creates a pool.
func NewWorkStealingPool() *WorkStealingPool {
	return &WorkStealingPool{deques: make(map[string]*Deque)}
}

// Register creates a deque for a worker.
func (p *WorkStealingPool) Register(workerID string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if _, ok := p.deques[workerID]; !ok {
		p.deques[workerID] = NewDeque()
	}
}

// Submit pushes work to a specific worker's deque.
func (p *WorkStealingPool) Submit(workerID string, item interface{}) bool {
	p.mu.RLock()
	d, ok := p.deques[workerID]
	p.mu.RUnlock()
	if !ok {
		return false
	}
	d.PushBottom(item)
	return true
}

// Take retrieves work from a worker's own deque (LIFO).
func (p *WorkStealingPool) Take(workerID string) (interface{}, bool) {
	p.mu.RLock()
	d, ok := p.deques[workerID]
	p.mu.RUnlock()
	if !ok {
		return nil, false
	}
	return d.PopBottom()
}

// Steal attempts to take work from another worker's deque (FIFO).
// Tries all other workers and returns the first successful steal.
func (p *WorkStealingPool) Steal(thiefID string) (interface{}, string, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	for workerID, d := range p.deques {
		if workerID == thiefID {
			continue
		}
		item, ok := d.StealTop()
		if ok {
			p.stolen++
			return item, workerID, true
		}
	}
	return nil, "", false
}

// TotalPending returns the total work items across all deques.
func (p *WorkStealingPool) TotalPending() int {
	p.mu.RLock()
	defer p.mu.RUnlock()
	total := 0
	for _, d := range p.deques {
		total += d.Len()
	}
	return total
}

// StolenCount returns the total number of successful steals.
func (p *WorkStealingPool) StolenCount() uint64 {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.stolen
}

// WorkerCount returns the number of registered workers.
func (p *WorkStealingPool) WorkerCount() int {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return len(p.deques)
}