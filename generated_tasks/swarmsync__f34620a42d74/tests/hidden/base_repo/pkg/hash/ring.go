package hash

import (
	"fmt"
	"hash/fnv"
	"sort"
	"sync"
)

// Ring implements consistent hashing with virtual nodes.
// Keys are mapped to a position on a hash ring [0, 2^32), and assigned
// to the first node encountered clockwise from that position.
type Ring struct {
	mu          sync.RWMutex
	replicas    int               // virtual nodes per physical node
	ring        []uint32          // sorted hash positions
	nodeMap     map[uint32]string // hash position → physical node ID
	members     map[string]bool   // physical node IDs
	memberCount int
}

// NewRing creates a consistent hash ring with the given number of virtual nodes
// per physical node. More replicas = smoother key distribution.
func NewRing(replicas int) *Ring {
	if replicas < 1 {
		replicas = 1
	}
	return &Ring{
		replicas: replicas,
		nodeMap:  make(map[uint32]string),
		members:  make(map[string]bool),
	}
}

// Add registers a physical node on the ring with `replicas` virtual nodes.
func (r *Ring) Add(nodeID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.members[nodeID] {
		return
	}
	r.members[nodeID] = true
	r.memberCount++
	for i := 0; i < r.replicas; i++ {
		h := virtualNodeHash(nodeID, i)
		r.ring = append(r.ring, h)
		r.nodeMap[h] = nodeID
	}
	sort.Slice(r.ring, func(i, j int) bool { return r.ring[i] < r.ring[j] })
}

// Remove deregisters a physical node from the ring.
func (r *Ring) Remove(nodeID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !r.members[nodeID] {
		return
	}
	delete(r.members, nodeID)
	r.memberCount--

	// Remove all virtual nodes for this physical node
	newRing := make([]uint32, 0, len(r.ring)-r.replicas)
	for _, h := range r.ring {
		if r.nodeMap[h] != nodeID {
			newRing = append(newRing, h)
		} else {
			delete(r.nodeMap, h)
		}
	}
	r.ring = newRing
}

// Lookup returns the physical node responsible for the given key.
// Returns "" if the ring is empty.
func (r *Ring) Lookup(key string) string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if len(r.ring) == 0 {
		return ""
	}
	h := keyHash(key)
	idx := sort.Search(len(r.ring), func(i int) bool { return r.ring[i] >= h })
	if idx >= len(r.ring) {
		idx = 0 // wrap around
	}
	return r.nodeMap[r.ring[idx]]
}

// LookupN returns the N distinct physical nodes closest (clockwise) to the key.
// Useful for replication factor decisions.
func (r *Ring) LookupN(key string, n int) []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if len(r.ring) == 0 || n <= 0 {
		return nil
	}
	if n > r.memberCount {
		n = r.memberCount
	}

	h := keyHash(key)
	idx := sort.Search(len(r.ring), func(i int) bool { return r.ring[i] >= h })

	seen := make(map[string]bool)
	result := make([]string, 0, n)
	for i := 0; i < len(r.ring) && len(result) < n; i++ {
		pos := (idx + i) % len(r.ring)
		node := r.nodeMap[r.ring[pos]]
		if !seen[node] {
			seen[node] = true
			result = append(result, node)
		}
	}
	return result
}

// Members returns all physical nodes currently on the ring.
func (r *Ring) Members() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]string, 0, r.memberCount)
	for id := range r.members {
		result = append(result, id)
	}
	sort.Strings(result)
	return result
}

// Size returns the number of physical nodes.
func (r *Ring) Size() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.memberCount
}

// VirtualNodeCount returns the total number of virtual nodes on the ring.
func (r *Ring) VirtualNodeCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.ring)
}

// Distribution returns a map of nodeID → number of keys assigned from the given key set.
func (r *Ring) Distribution(keys []string) map[string]int {
	dist := make(map[string]int)
	for _, k := range keys {
		node := r.Lookup(k)
		if node != "" {
			dist[node]++
		}
	}
	return dist
}

// KeysForNode returns which keys from the given set are assigned to the specified node.
func (r *Ring) KeysForNode(nodeID string, keys []string) []string {
	var result []string
	for _, k := range keys {
		if r.Lookup(k) == nodeID {
			result = append(result, k)
		}
	}
	return result
}

// TransferKeys computes which keys need to be transferred when a node is added.
// Returns a map of sourceNode → []keys that should move to the new node.
func (r *Ring) TransferKeys(newNodeID string, keys []string) map[string][]string {
	// Get current assignment
	before := make(map[string]string, len(keys))
	for _, k := range keys {
		before[k] = r.Lookup(k)
	}

	// Simulate adding on a temporary copy to avoid mutating the ring
	tmp := r.clone()
	tmp.Add(newNodeID)

	// Compute transfers
	transfers := make(map[string][]string)
	for _, k := range keys {
		after := tmp.Lookup(k)
		if after == newNodeID && before[k] != newNodeID {
			transfers[before[k]] = append(transfers[before[k]], k)
		}
	}
	return transfers
}

func (r *Ring) clone() *Ring {
	r.mu.RLock()
	defer r.mu.RUnlock()
	cp := &Ring{
		replicas:    r.replicas,
		ring:        make([]uint32, len(r.ring)),
		nodeMap:     make(map[uint32]string, len(r.nodeMap)),
		members:     make(map[string]bool, len(r.members)),
		memberCount: r.memberCount,
	}
	copy(cp.ring, r.ring)
	for k, v := range r.nodeMap {
		cp.nodeMap[k] = v
	}
	for k, v := range r.members {
		cp.members[k] = v
	}
	return cp
}

// virtualNodeHash creates a hash for virtual node i of a physical node.
func virtualNodeHash(nodeID string, index int) uint32 {
	key := fmt.Sprintf("%s#%d", nodeID, index)
	h := fnv.New32a()
	h.Write([]byte(key))
	return h.Sum32()
}

// HasNode checks if a physical node is registered.
func (r *Ring) HasNode(nodeID string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.members[nodeID]
}

// keyHash creates a 32-bit hash of a key for ring placement.
func keyHash(key string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(key))
	return h.Sum32()
}
