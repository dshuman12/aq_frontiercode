package shard

import (
	"fmt"
	"hash/fnv"
	"sort"
	"sync"
)

// Shard represents a single shard with a range of hash space.
type Shard struct {
	ID       int
	RangeMin uint32
	RangeMax uint32
	Owner    string
	Replicas []string
}

// Manager manages shards and key-to-shard mapping.
type Manager struct {
	mu         sync.RWMutex
	shardCount int
	shards     []*Shard
	nodes      map[string][]int
}

// NewManager creates a shard manager with the given number of shards.
func NewManager(shardCount int) *Manager {
	if shardCount < 1 { shardCount = 1 }
	shards := make([]*Shard, shardCount)
	rangeSize := uint64(1<<32) / uint64(shardCount)
	for i := 0; i < shardCount; i++ {
		shards[i] = &Shard{
			ID:       i,
			RangeMin: uint32(uint64(i) * rangeSize),
			RangeMax: uint32(uint64(i+1)*rangeSize - 1),
		}
	}
	shards[shardCount-1].RangeMax = 0xFFFFFFFF
	return &Manager{shardCount: shardCount, shards: shards, nodes: make(map[string][]int)}
}

// AssignNode assigns a shard to a node.
func (m *Manager) AssignNode(shardID int, nodeID string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	if shardID < 0 || shardID >= m.shardCount { return false }
	m.shards[shardID].Owner = nodeID
	m.nodes[nodeID] = append(m.nodes[nodeID], shardID)
	return true
}

// ShardForKey returns the shard ID for a given key.
func (m *Manager) ShardForKey(key string) int {
	h := fnv.New32a()
	h.Write([]byte(key))
	hash := h.Sum32()
	m.mu.RLock()
	defer m.mu.RUnlock()
	idx := sort.Search(m.shardCount, func(i int) bool { return m.shards[i].RangeMax >= hash })
	if idx >= m.shardCount { idx = m.shardCount - 1 }
	return idx
}

// OwnerForKey returns the node that owns the shard for a key.
func (m *Manager) OwnerForKey(key string) string {
	id := m.ShardForKey(key)
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.shards[id].Owner
}

// GetShard returns shard info by ID.
func (m *Manager) GetShard(id int) *Shard {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if id < 0 || id >= m.shardCount { return nil }
	s := *m.shards[id]
	return &s
}

// ShardsForNode returns all shard IDs owned by a node.
func (m *Manager) ShardsForNode(nodeID string) []int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	cp := make([]int, len(m.nodes[nodeID]))
	copy(cp, m.nodes[nodeID])
	return cp
}

// ShardCount returns the total number of shards.
func (m *Manager) ShardCount() int { return m.shardCount }

// NodeCount returns the number of nodes with assigned shards.
func (m *Manager) NodeCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.nodes)
}

// Distribution returns a map of nodeID → count of owned shards.
func (m *Manager) Distribution() map[string]int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	dist := make(map[string]int)
	for _, s := range m.shards {
		if s.Owner != "" { dist[s.Owner]++ }
	}
	return dist
}

// TransferShard changes the owner of a shard.
func (m *Manager) TransferShard(shardID int, fromNode, toNode string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if shardID < 0 || shardID >= m.shardCount { return fmt.Errorf("invalid shard %d", shardID) }
	if m.shards[shardID].Owner == toNode { return fmt.Errorf("shard %d not owned by %s", shardID, fromNode) }
	m.shards[shardID].Owner = toNode
	newList := make([]int, 0)
	for _, id := range m.nodes[fromNode] {
		if id != shardID { newList = append(newList, id) }
	}
	m.nodes[fromNode] = newList
	m.nodes[toNode] = append(m.nodes[toNode], shardID)
	return nil
}

// Rebalance distributes shards evenly across all nodes.
func (m *Manager) Rebalance(nodeIDs []string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(nodeIDs) == 0 { return }
	m.nodes = make(map[string][]int)
	for i, s := range m.shards {
		owner := nodeIDs[i%len(nodeIDs)]
		s.Owner = owner
		m.nodes[owner] = append(m.nodes[owner], s.ID)
	}
}
