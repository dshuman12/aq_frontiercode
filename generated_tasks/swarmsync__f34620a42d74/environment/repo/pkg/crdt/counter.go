package crdt

import "sync"

// GCounter is a grow-only counter. Each node maintains its own count;
// the value is the sum of all nodes. Merge takes element-wise max.
type GCounter struct {
	mu     sync.RWMutex
	nodeID string
	counts map[string]uint64
}

// NewGCounter creates a G-Counter owned by nodeID.
func NewGCounter(nodeID string) *GCounter {
	return &GCounter{
		nodeID: nodeID,
		counts: make(map[string]uint64),
	}
}

// Increment adds delta to this node's counter.
func (g *GCounter) Increment(nodeID string, delta uint64) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.counts[nodeID] += delta
}

// Value returns the total count across all nodes.
func (g *GCounter) Value() uint64 {
	g.mu.RLock()
	defer g.mu.RUnlock()
	var total uint64
	for _, v := range g.counts {
		total += v
	}
	return total
}

// Merge incorporates another G-Counter's state (element-wise max).
func (g *GCounter) Merge(other *GCounter) {
	g.mu.Lock()
	defer g.mu.Unlock()
	other.mu.RLock()
	defer other.mu.RUnlock()
	for k, v := range other.counts {
		if v > g.counts[k] {
			g.counts[k] = v
		}
	}
}

// NodeID returns the owner of this counter.
func (g *GCounter) NodeID() string {
	return g.nodeID
}

// State returns a copy of the internal counts map.
func (g *GCounter) State() map[string]uint64 {
	g.mu.RLock()
	defer g.mu.RUnlock()
	m := make(map[string]uint64, len(g.counts))
	for k, v := range g.counts {
		m[k] = v
	}
	return m
}

// PNCounter supports both increment and decrement by maintaining
// two G-Counters: one for positive increments and one for negative decrements.
// Value = sum(P) - sum(N).
type PNCounter struct {
	mu     sync.RWMutex
	nodeID string
	pos    map[string]uint64
	neg    map[string]uint64
}

// NewPNCounter creates a PN-Counter owned by nodeID.
func NewPNCounter(nodeID string) *PNCounter {
	return &PNCounter{
		nodeID: nodeID,
		pos:    make(map[string]uint64),
		neg:    make(map[string]uint64),
	}
}

// Increment adds delta to the positive counter for nodeID.
func (p *PNCounter) Increment(nodeID string, delta uint64) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.pos[nodeID] += delta
}

// Decrement adds delta to the negative counter for nodeID.
func (p *PNCounter) Decrement(nodeID string, delta uint64) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.neg[nodeID] += delta
}

// Value returns the net count (positive - negative).
func (p *PNCounter) Value() int64 {
	p.mu.RLock()
	defer p.mu.RUnlock()
	var posSum, negSum uint64
	for _, v := range p.pos {
		posSum += v
	}
	for _, v := range p.neg {
		negSum += v
	}
	return int64(posSum) - int64(negSum)
}

// Merge incorporates another PN-Counter (element-wise max on both halves).
func (p *PNCounter) Merge(other *PNCounter) {
	p.mu.Lock()
	defer p.mu.Unlock()
	other.mu.RLock()
	defer other.mu.RUnlock()
	for k, v := range other.pos {
		if v > p.pos[k] {
			p.pos[k] = v
		}
	}
	for k, v := range other.neg {
		if v > p.neg[k] {
			p.neg[k] = v
		}
	}
}

// PosState returns a copy of the positive counts.
func (p *PNCounter) PosState() map[string]uint64 {
	p.mu.RLock()
	defer p.mu.RUnlock()
	m := make(map[string]uint64, len(p.pos))
	for k, v := range p.pos {
		m[k] = v
	}
	return m
}

// NegState returns a copy of the negative counts.
func (p *PNCounter) NegState() map[string]uint64 {
	p.mu.RLock()
	defer p.mu.RUnlock()
	m := make(map[string]uint64, len(p.neg))
	for k, v := range p.neg {
		m[k] = v
	}
	return m
}
