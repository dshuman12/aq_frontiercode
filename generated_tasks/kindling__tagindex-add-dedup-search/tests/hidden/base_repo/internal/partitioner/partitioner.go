// Package partitioner assigns records to partitions deterministically
// using consistent hashing or modulo on a chosen field.
//
// For most kindling deployments modulo is fine: cardinality is
// bounded, partitions rarely change. Consistent hashing is offered for
// the (rare) case where the partition set rebalances at runtime.
package partitioner

import (
	"hash/fnv"
	"sort"
	"sync"
)

// Strategy chooses an assignment algorithm.
type Strategy interface {
	Assign(key string) int
	Partitions() int
}

// Modulo maps key -> hash(key) % N.
type Modulo struct {
	N int
}

// NewModulo constructs a Modulo strategy.
func NewModulo(n int) *Modulo {
	if n <= 0 {
		n = 1
	}
	return &Modulo{N: n}
}

// Assign returns the partition for key.
func (m *Modulo) Assign(key string) int {
	h := fnv.New64a()
	_, _ = h.Write([]byte(key))
	return int(h.Sum64() % uint64(m.N))
}

// Partitions returns the partition count.
func (m *Modulo) Partitions() int { return m.N }

// Consistent implements consistent hashing with virtual nodes.
type Consistent struct {
	mu       sync.RWMutex
	replicas int
	ring     []ringEntry
	nodes    map[string]struct{}
}

type ringEntry struct {
	hash uint64
	node string
}

// NewConsistent builds an empty ring with the given replica factor.
func NewConsistent(replicas int) *Consistent {
	if replicas <= 0 {
		replicas = 32
	}
	return &Consistent{replicas: replicas, nodes: map[string]struct{}{}}
}

// AddNode adds a node to the ring.
func (c *Consistent) AddNode(node string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if _, ok := c.nodes[node]; ok {
		return
	}
	c.nodes[node] = struct{}{}
	for i := 0; i < c.replicas; i++ {
		key := node + "#" + itoa(i)
		c.ring = append(c.ring, ringEntry{hash: hash64(key), node: node})
	}
	sort.Slice(c.ring, func(i, j int) bool { return c.ring[i].hash < c.ring[j].hash })
}

// RemoveNode removes a node from the ring.
func (c *Consistent) RemoveNode(node string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.nodes, node)
	survivors := c.ring[:0]
	for _, e := range c.ring {
		if e.node != node {
			survivors = append(survivors, e)
		}
	}
	c.ring = survivors
}

// Assign maps key to one of the registered nodes via the ring.
// Returns -1 when no nodes are registered.
func (c *Consistent) Assign(key string) int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if len(c.ring) == 0 {
		return -1
	}
	h := hash64(key)
	idx := sort.Search(len(c.ring), func(i int) bool {
		return c.ring[i].hash >= h
	})
	if idx == len(c.ring) {
		idx = 0
	}
	// Map node name -> stable integer index
	names := c.nodeNamesLocked()
	target := c.ring[idx].node
	for i, n := range names {
		if n == target {
			return i
		}
	}
	return -1
}

// Partitions returns the number of distinct nodes.
func (c *Consistent) Partitions() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.nodes)
}

func (c *Consistent) nodeNamesLocked() []string {
	out := make([]string, 0, len(c.nodes))
	for n := range c.nodes {
		out = append(out, n)
	}
	sort.Strings(out)
	return out
}

func hash64(s string) uint64 {
	h := fnv.New64a()
	_, _ = h.Write([]byte(s))
	return h.Sum64()
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	v := n
	for v > 0 {
		i--
		buf[i] = byte('0' + v%10)
		v /= 10
	}
	return string(buf[i:])
}
