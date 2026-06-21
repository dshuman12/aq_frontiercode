package gossip

import "sync"

// AntiEntropyScheduler manages periodic anti-entropy synchronization.
// It tracks which pairs have been synced recently to avoid redundant work.
type AntiEntropyScheduler struct {
	mu       sync.Mutex
	synced   map[pairKey]uint64
	round    uint64
	interval uint64
}

type pairKey struct{ a, b string }

func makePairKey(a, b string) pairKey {
	if a > b { a, b = b, a }
	return pairKey{a, b}
}

// NewAntiEntropyScheduler creates a scheduler that triggers sync every `interval` rounds.
func NewAntiEntropyScheduler(interval uint64) *AntiEntropyScheduler {
	if interval == 0 { interval = 1 }
	return &AntiEntropyScheduler{synced: make(map[pairKey]uint64), interval: interval}
}

// ShouldSync returns true if nodes a and b should synchronize this round.
func (s *AntiEntropyScheduler) ShouldSync(a, b string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := makePairKey(a, b)
	lastSync, synced := s.synced[key]
	if !synced { return true }
	return s.round-lastSync >= s.interval
}

// RecordSync marks that nodes a and b have synchronized.
func (s *AntiEntropyScheduler) RecordSync(a, b string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.synced[makePairKey(a, b)] = s.round
}

// AdvanceRound increments the round counter.
func (s *AntiEntropyScheduler) AdvanceRound() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.round++
}

// Round returns the current round.
func (s *AntiEntropyScheduler) Round() uint64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.round
}

// PairsSynced returns the number of tracked pair syncs.
func (s *AntiEntropyScheduler) PairsSynced() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.synced)
}

// Reset clears all sync records.
func (s *AntiEntropyScheduler) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.synced = make(map[pairKey]uint64)
	s.round = 0
}
