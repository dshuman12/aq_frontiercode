package gossip

import (
	"math/rand"
	"sync"
	"sync/atomic"
)

// PeerSelector chooses which peers to gossip with.
type PeerSelector interface {
	// SelectPeers returns up to n peers from the available set, excluding self.
	SelectPeers(available []string, self string, n int) []string
}

// RandomPeerSelector selects peers uniformly at random.
type RandomPeerSelector struct {
	rng *rand.Rand
	mu  sync.Mutex
}

// NewRandomPeerSelector creates a selector with the given seed.
func NewRandomPeerSelector(seed int64) *RandomPeerSelector {
	return &RandomPeerSelector{rng: rand.New(rand.NewSource(seed))}
}

// SelectPeers picks up to n peers at random.
func (r *RandomPeerSelector) SelectPeers(available []string, self string, n int) []string {
	r.mu.Lock()
	defer r.mu.Unlock()

	candidates := make([]string, 0, len(available))
	for _, p := range available {
		if p != self {
			candidates = append(candidates, p)
		}
	}
	if len(candidates) == 0 {
		return nil
	}
	if n > len(candidates) {
		n = len(candidates)
	}

	// Fisher-Yates shuffle, take first n
	for i := len(candidates) - 1; i > 0; i-- {
		j := r.rng.Intn(i + 1)
		candidates[i], candidates[j] = candidates[j], candidates[i]
	}
	return candidates[:n]
}

// ExchangeResult holds the outcome of a push-pull exchange between two nodes.
type ExchangeResult struct {
	PushedTo   int // entries pushed to remote
	PulledFrom int // entries pulled from remote
}

// Protocol implements the push-pull gossip algorithm.
// On each round:
//  1. Push: compute diff against remote digest → send missing entries
//  2. Pull: send own digest → receive missing entries from remote
type Protocol struct {
	nodeID   string
	store    *StateStore
	selector PeerSelector
	fanout   int // number of peers to contact per round
	rounds   atomic.Int64
}

// NewProtocol creates a gossip protocol instance.
func NewProtocol(nodeID string, store *StateStore, selector PeerSelector, fanout int) *Protocol {
	if fanout < 1 {
		fanout = 1
	}
	return &Protocol{
		nodeID:   nodeID,
		store:    store,
		selector: selector,
		fanout:   fanout,
	}
}

// PushPull performs a single push-pull exchange with another node's store.
// This is the core gossip operation:
//  1. Build digests from both sides
//  2. Compute diffs: what local has that remote doesn't, and vice versa
//  3. Apply diffs to both sides
func (p *Protocol) PushPull(remote *StateStore) ExchangeResult {
	p.rounds.Add(1)

	// Phase 1: Exchange digests
	localDigest := p.store.Digest()
	remoteDigest := remote.Digest()

	// Phase 2: Compute diffs
	pushEntries := p.store.Diff(remoteDigest) // local has, remote doesn't
	pullEntries := remote.Diff(localDigest)   // remote has, local doesn't

	// Phase 3: Apply
	pushed := remote.Apply(pushEntries)
	pulled := p.store.Apply(pullEntries)

	return ExchangeResult{PushedTo: pushed, PulledFrom: pulled}
}

// Push sends local state to a remote node without pulling.
func (p *Protocol) Push(remote *StateStore) int {
	p.rounds.Add(1)
	remoteDigest := remote.Digest()
	pushEntries := p.store.Diff(remoteDigest)
	return remote.Apply(pushEntries)
}

// Pull fetches remote state without pushing local state.
func (p *Protocol) Pull(remote *StateStore) int {
	p.rounds.Add(1)
	localDigest := p.store.Digest()
	pullEntries := remote.Diff(localDigest)
	return p.store.Apply(pullEntries)
}

// Rounds returns the total number of gossip rounds executed.
func (p *Protocol) Rounds() int64 {
	return p.rounds.Load()
}

// Store returns the underlying state store.
func (p *Protocol) Store() *StateStore {
	return p.store
}

// Fanout returns the configured fanout.
func (p *Protocol) Fanout() int {
	return p.fanout
}

// Cluster simulates a cluster of gossip nodes for testing and simulation.
type Cluster struct {
	mu       sync.RWMutex
	nodes    map[string]*Protocol
	peerList []string
}

// NewCluster creates an empty cluster.
func NewCluster() *Cluster {
	return &Cluster{
		nodes: make(map[string]*Protocol),
	}
}

// AddNode registers a node in the cluster.
func (c *Cluster) AddNode(nodeID string, proto *Protocol) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.nodes[nodeID] = proto
	c.peerList = append(c.peerList, nodeID)
}

// GetNode returns a node's protocol by ID.
func (c *Cluster) GetNode(nodeID string) *Protocol {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.nodes[nodeID]
}

// RunRound executes one gossip round for all nodes.
// Each node selects fanout peers and performs push-pull with each.
func (c *Cluster) RunRound() map[string][]ExchangeResult {
	c.mu.RLock()
	defer c.mu.RUnlock()

	results := make(map[string][]ExchangeResult)
	for nodeID, proto := range c.nodes {
		peers := proto.selector.SelectPeers(c.peerList, nodeID, proto.fanout)
		var nodeResults []ExchangeResult
		for _, peerID := range peers {
			peer := c.nodes[peerID]
			if peer != nil {
				r := proto.PushPull(peer.store)
				nodeResults = append(nodeResults, r)
			}
		}
		results[nodeID] = nodeResults
	}
	return results
}

// Converged checks if all nodes have the same state hash.
func (c *Cluster) Converged() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	var firstHash [32]byte
	first := true
	for _, proto := range c.nodes {
		h := proto.store.Hash()
		if first {
			firstHash = h
			first = false
		} else if h != firstHash {
			return false
		}
	}
	return true
}

// Size returns the number of nodes.
func (c *Cluster) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.nodes)
}