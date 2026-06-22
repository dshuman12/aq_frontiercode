package rendezvous

import (
	"hash/fnv"
	"sort"
	"sync"
)

// Hash implements Highest Random Weight (HRW) / rendezvous hashing.
// Each key is assigned to the node that produces the highest hash
// when combined with the key. Unlike consistent hashing, this requires
// no virtual nodes and provides perfect load balance.
type Hash struct {
	mu    sync.RWMutex
	nodes []string
}

// New creates an empty rendezvous hash.
func New() *Hash { return &Hash{} }

// Add registers a node.
func (h *Hash) Add(node string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, n := range h.nodes {
		if n == node { return }
	}
	h.nodes = append(h.nodes, node)
	sort.Strings(h.nodes)
}

// Remove deregisters a node.
func (h *Hash) Remove(node string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for i, n := range h.nodes {
		if n == node {
			h.nodes = append(h.nodes[:i], h.nodes[i+1:]...)
			return
		}
	}
}

// Lookup returns the node responsible for the given key.
func (h *Hash) Lookup(key string) string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if len(h.nodes) == 0 { return "" }
	var bestNode string
	var bestScore uint64
	for _, node := range h.nodes {
		score := hashCombine(key, node)
		if score > bestScore || bestNode == "" {
			bestScore = score
			bestNode = node
		}
	}
	return bestNode
}

// LookupN returns the top N nodes for the given key, ordered by score.
func (h *Hash) LookupN(key string, n int) []string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if n > len(h.nodes) { n = len(h.nodes) }
	if n <= 0 { return nil }
	type scored struct { node string; score uint64 }
	scores := make([]scored, len(h.nodes))
	for i, node := range h.nodes {
		scores[i] = scored{node, hashCombine(key, node)}
	}
	sort.Slice(scores, func(i, j int) bool { return scores[i].score > scores[j].score })
	result := make([]string, n)
	for i := 0; i < n; i++ { result[i] = scores[i].node }
	return result
}

// Nodes returns all registered nodes.
func (h *Hash) Nodes() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	cp := make([]string, len(h.nodes))
	copy(cp, h.nodes)
	return cp
}

// Size returns the number of nodes.
func (h *Hash) Size() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.nodes)
}

// Distribution returns a map of nodeID → count for the given keys.
func (h *Hash) Distribution(keys []string) map[string]int {
	dist := make(map[string]int)
	for _, k := range keys {
		node := h.Lookup(k)
		if node != "" { dist[node]++ }
	}
	return dist
}

func hashCombine(key, node string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(key))
	h.Write([]byte{0})
	h.Write([]byte(node))
	return h.Sum64()
}
