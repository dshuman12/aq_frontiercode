package consistent

import (
	"hash/fnv"
	"sort"
	"sync"
)

// BoundedLoadHash implements consistent hashing with bounded loads.
type BoundedLoadHash struct {
	mu          sync.RWMutex
	replicas    int
	ring        []uint32
	nodeMap     map[uint32]string
	members     map[string]bool
	loads       map[string]int
	loadFactor  float64
	totalLoad   int
	memberCount int
}

// NewBoundedLoadHash creates a bounded-load consistent hash.
func NewBoundedLoadHash(replicas int, loadFactor float64) *BoundedLoadHash {
	if replicas < 1 { replicas = 1 }
	if loadFactor < 1.0 { loadFactor = 1.25 }
	return &BoundedLoadHash{
		replicas: replicas, nodeMap: make(map[uint32]string),
		members: make(map[string]bool), loads: make(map[string]int), loadFactor: loadFactor,
	}
}

// Add registers a node.
func (h *BoundedLoadHash) Add(nodeID string) {
	h.mu.Lock(); defer h.mu.Unlock()
	if h.members[nodeID] { return }
	h.members[nodeID] = true; h.memberCount++; h.loads[nodeID] = 0
	for i := 0; i < h.replicas; i++ {
		hash := hashKey(nodeID, i)
		h.nodeMap[hash] = nodeID
		idx := sort.Search(len(h.ring), func(j int) bool { return h.ring[j] >= hash })
		h.ring = append(h.ring, 0)
		copy(h.ring[idx+1:], h.ring[idx:]); h.ring[idx] = hash
	}
}

// Remove deregisters a node.
func (h *BoundedLoadHash) Remove(nodeID string) {
	h.mu.Lock(); defer h.mu.Unlock()
	if !h.members[nodeID] { return }
	delete(h.members, nodeID); h.memberCount--
	h.totalLoad -= h.loads[nodeID]; delete(h.loads, nodeID)
	newRing := make([]uint32, 0, len(h.ring)-h.replicas)
	for _, v := range h.ring {
		if h.nodeMap[v] != nodeID { newRing = append(newRing, v) } else { delete(h.nodeMap, v) }
	}
	h.ring = newRing
}

// Get returns the node for a key, respecting load bounds.
func (h *BoundedLoadHash) Get(key string) string {
	h.mu.Lock(); defer h.mu.Unlock()
	if len(h.ring) == 0 { return "" }
	hash := hashSingle(key)
	idx := sort.Search(len(h.ring), func(i int) bool { return h.ring[i] >= hash })
	maxLoad := h.maxLoadPerNode()
	for i := 0; i < len(h.ring); i++ {
		pos := (idx + i) % len(h.ring)
		node := h.nodeMap[h.ring[pos]]
		if h.loads[node] < maxLoad {
			h.loads[node]++; h.totalLoad++; return node
		}
	}
	node := h.nodeMap[h.ring[idx%len(h.ring)]]
	h.loads[node]++; h.totalLoad++; return node
}

// Release decrements the load for a node.
func (h *BoundedLoadHash) Release(nodeID string) {
	h.mu.Lock(); defer h.mu.Unlock()
	if h.loads[nodeID] > 0 { h.loads[nodeID]--; h.totalLoad-- }
}

// Load returns the current load for a node.
func (h *BoundedLoadHash) Load(nodeID string) int { h.mu.RLock(); defer h.mu.RUnlock(); return h.loads[nodeID] }

// TotalLoad returns total load across all nodes.
func (h *BoundedLoadHash) TotalLoad() int { h.mu.RLock(); defer h.mu.RUnlock(); return h.totalLoad }

// Size returns the number of nodes.
func (h *BoundedLoadHash) Size() int { h.mu.RLock(); defer h.mu.RUnlock(); return h.memberCount }

func (h *BoundedLoadHash) maxLoadPerNode() int {
	if h.memberCount == 0 { return 1 }
	avg := float64(h.totalLoad+1) / float64(h.memberCount)
	if avg < 1 { avg = 1 }
	return int(avg * h.loadFactor)
}

func hashKey(nodeID string, index int) uint32 {
	h := fnv.New32a()
	h.Write([]byte(nodeID)); h.Write([]byte{byte(index >> 8), byte(index)})
	return h.Sum32()
}

func hashSingle(key string) uint32 {
	h := fnv.New32a(); h.Write([]byte(key)); return h.Sum32()
}
