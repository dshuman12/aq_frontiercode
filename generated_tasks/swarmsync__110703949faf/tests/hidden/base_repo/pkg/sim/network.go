package sim

import (
	"math/rand"
	"sort"
	"sync"

	"github.com/Mustafa4ngin/SwarmSync/pkg/gossip"
	"github.com/Mustafa4ngin/SwarmSync/pkg/merkle"
)

// Event represents a discrete simulation event.
type Event struct {
	Time     uint64
	Type     EventType
	Source   string
	Target   string
	Payload  interface{}
}

// EventType identifies the kind of simulation event.
type EventType int

const (
	EventGossip     EventType = iota
	EventMerkleDiff
	EventNodeJoin
	EventNodeLeave
	EventPartition
	EventHeal
)

// NetworkSim simulates a cluster of gossip nodes with configurable
// network conditions: latency, packet loss, and partitions.
type NetworkSim struct {
	mu         sync.Mutex
	nodes      map[string]*gossip.Protocol
	stores     map[string]*gossip.StateStore
	partitions map[string]map[string]bool // blocked connections
	clock      uint64
	events     []Event
	dropRate   float64 // probability of dropping a message
	rng        *rand.Rand
}

// NewNetworkSim creates a simulation.
func NewNetworkSim(seed int64) *NetworkSim {
	return &NetworkSim{
		nodes:      make(map[string]*gossip.Protocol),
		stores:     make(map[string]*gossip.StateStore),
		partitions: make(map[string]map[string]bool),
		rng:        rand.New(rand.NewSource(seed)),
	}
}

// AddNode registers a node in the simulation.
func (ns *NetworkSim) AddNode(nodeID string, fanout int) {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	store := gossip.NewStateStore(nodeID)
	sel := gossip.NewRandomPeerSelector(ns.rng.Int63())
	proto := gossip.NewProtocol(nodeID, store, sel, fanout)
	ns.nodes[nodeID] = proto
	ns.stores[nodeID] = store
	ns.events = append(ns.events, Event{
		Time:   ns.clock,
		Type:   EventNodeJoin,
		Source: nodeID,
	})
}

// RemoveNode removes a node from the simulation.
func (ns *NetworkSim) RemoveNode(nodeID string) {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	delete(ns.nodes, nodeID)
	delete(ns.stores, nodeID)
	delete(ns.partitions, nodeID)
	for _, blocked := range ns.partitions {
		delete(blocked, nodeID)
	}
	ns.events = append(ns.events, Event{
		Time:   ns.clock,
		Type:   EventNodeLeave,
		Source: nodeID,
	})
}

// SetDropRate sets the probability of dropping a gossip message.
func (ns *NetworkSim) SetDropRate(rate float64) {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	ns.dropRate = rate
}

// Partition blocks communication between two nodes.
func (ns *NetworkSim) Partition(a, b string) {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	if ns.partitions[a] == nil {
		ns.partitions[a] = make(map[string]bool)
	}
	if ns.partitions[b] == nil {
		ns.partitions[b] = make(map[string]bool)
	}
	ns.partitions[a][b] = true
	ns.partitions[b][a] = true
	ns.events = append(ns.events, Event{
		Time:   ns.clock,
		Type:   EventPartition,
		Source: a,
		Target: b,
	})
}

// Heal restores communication between two nodes.
func (ns *NetworkSim) Heal(a, b string) {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	if ns.partitions[a] != nil {
		delete(ns.partitions[a], b)
	}
	if ns.partitions[b] != nil {
		delete(ns.partitions[b], a)
	}
	ns.events = append(ns.events, Event{
		Time:   ns.clock,
		Type:   EventHeal,
		Source: a,
		Target: b,
	})
}

// isPartitioned checks if two nodes are partitioned.
func (ns *NetworkSim) isPartitioned(a, b string) bool {
	if blocked, ok := ns.partitions[a]; ok {
		return blocked[b]
	}
	return false
}

// RunGossipRound executes one round of gossip for all nodes.
// Each node picks fanout peers and performs push-pull, subject to
// network conditions (partitions, packet loss).
func (ns *NetworkSim) RunGossipRound() SimRoundResult {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	ns.clock++

	var result SimRoundResult
	peerList := ns.peerList()

	for nodeID, proto := range ns.nodes {
		sel := gossip.NewRandomPeerSelector(ns.rng.Int63())
		peers := sel.SelectPeers(peerList, nodeID, proto.Fanout())

		for _, peerID := range peers {
			if ns.isPartitioned(nodeID, peerID) {
				result.Blocked++
				continue
			}
			if ns.dropRate > 0 && ns.rng.Float64() < ns.dropRate {
				result.Dropped++
				continue
			}
			peerStore, ok := ns.stores[peerID]
			if !ok {
				continue
			}
			exchange := proto.PushPull(peerStore)
			result.Exchanges++
			result.PushedTotal += exchange.PushedTo
			result.PulledTotal += exchange.PulledFrom

			ns.events = append(ns.events, Event{
				Time:    ns.clock,
				Type:    EventGossip,
				Source:  nodeID,
				Target:  peerID,
				Payload: exchange,
			})
		}
	}
	return result
}

// RunMerkleSyncRound performs merkle-based anti-entropy between random pairs.
func (ns *NetworkSim) RunMerkleSyncRound() int {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	ns.clock++

	synced := 0
	peerList := ns.peerList()
	if len(peerList) < 2 {
		return 0
	}

	for nodeID, store := range ns.stores {
		// Pick a random peer
		sel := gossip.NewRandomPeerSelector(ns.rng.Int63())
		peers := sel.SelectPeers(peerList, nodeID, 1)
		if len(peers) == 0 {
			continue
		}
		peerID := peers[0]
		if ns.isPartitioned(nodeID, peerID) {
			continue
		}

		peerStore, ok := ns.stores[peerID]
		if !ok {
			continue
		}

		// Build merkle trees from both stores
		localTree := storeToTree(store)
		remoteTree := storeToTree(peerStore)
		diff := merkle.FastDiff(localTree, remoteTree)

		// Sync differing keys using Apply to preserve versions
		for _, key := range diff.OnlyRemote {
			e, ok := peerStore.GetEntry(key)
			if ok {
				store.Apply([]*gossip.StateEntry{e})
				synced++
			}
		}
		for _, key := range diff.OnlyLocal {
			e, ok := store.GetEntry(key)
			if ok {
				peerStore.Apply([]*gossip.StateEntry{e})
				synced++
			}
		}
		for _, key := range diff.Different {
			le, _ := store.GetEntry(key)
			re, _ := peerStore.GetEntry(key)
			if le != nil && re != nil {
				if le.Version > re.Version {
					peerStore.Apply([]*gossip.StateEntry{le})
				} else {
					store.Apply([]*gossip.StateEntry{re})
				}
				synced++
			}
		}

		ns.events = append(ns.events, Event{
			Time:    ns.clock,
			Type:    EventMerkleDiff,
			Source:  nodeID,
			Target:  peerID,
			Payload: diff.TotalDiffs(),
		})
	}
	return synced
}

func storeToTree(store *gossip.StateStore) *merkle.Tree {
	tree := merkle.NewTree()
	entries := make(map[string][]byte)
	for _, key := range store.Keys() {
		v, ok := store.Get(key)
		if ok {
			entries[key] = v
		}
	}
	tree.PutBatch(entries)
	return tree
}

func (ns *NetworkSim) peerList() []string {
	list := make([]string, 0, len(ns.nodes))
	for id := range ns.nodes {
		list = append(list, id)
	}
	sort.Strings(list)
	return list
}

// Converged checks if all nodes have the same state hash.
func (ns *NetworkSim) Converged() bool {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	var firstHash [32]byte
	first := true
	for _, store := range ns.stores {
		h := store.Hash()
		if first {
			firstHash = h
			first = false
		} else if h != firstHash {
			return false
		}
	}
	return true
}

// GetStore returns a node's state store.
func (ns *NetworkSim) GetStore(nodeID string) *gossip.StateStore {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	return ns.stores[nodeID]
}

// Clock returns the current simulation time.
func (ns *NetworkSim) Clock() uint64 {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	return ns.clock
}

// EventLog returns all recorded events.
func (ns *NetworkSim) EventLog() []Event {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	log := make([]Event, len(ns.events))
	copy(log, ns.events)
	return log
}

// NodeCount returns the number of active nodes.
func (ns *NetworkSim) NodeCount() int {
	ns.mu.Lock()
	defer ns.mu.Unlock()
	return len(ns.nodes)
}

// SimRoundResult holds statistics from one gossip round.
type SimRoundResult struct {
	Exchanges   int
	PushedTotal int
	PulledTotal int
	Blocked     int
	Dropped     int
}