package sim

import (
	"fmt"
	"testing"
)

func TestNetworkSim_AddNode(t *testing.T) {
	ns := NewNetworkSim(42)
	ns.AddNode("n1", 2)
	ns.AddNode("n2", 2)
	if ns.NodeCount() != 2 {
		t.Fatalf("expected 2, got %d", ns.NodeCount())
	}
}

func TestNetworkSim_RemoveNode(t *testing.T) {
	ns := NewNetworkSim(42)
	ns.AddNode("n1", 2)
	ns.AddNode("n2", 2)
	ns.RemoveNode("n1")
	if ns.NodeCount() != 1 {
		t.Fatal("expected 1 after remove")
	}
}

func TestNetworkSim_Convergence(t *testing.T) {
	ns := NewNetworkSim(42)
	for i := 0; i < 5; i++ {
		nodeID := fmt.Sprintf("n%d", i)
		ns.AddNode(nodeID, 2)
	}

	// Each node writes unique data
	for i := 0; i < 5; i++ {
		nodeID := fmt.Sprintf("n%d", i)
		store := ns.GetStore(nodeID)
		store.Put(fmt.Sprintf("key-%s", nodeID), []byte(fmt.Sprintf("val-%s", nodeID)))
	}

	for round := 0; round < 30; round++ {
		ns.RunGossipRound()
		if ns.Converged() {
			return
		}
	}
	t.Fatal("cluster did not converge in 30 rounds")
}

func TestNetworkSim_PartitionBlocksGossip(t *testing.T) {
	ns := NewNetworkSim(42)
	ns.AddNode("n1", 1)
	ns.AddNode("n2", 1)
	ns.GetStore("n1").Put("k1", []byte("v1"))

	ns.Partition("n1", "n2")
	for i := 0; i < 10; i++ {
		ns.RunGossipRound()
	}

	// n2 should NOT have k1 because of partition
	_, ok := ns.GetStore("n2").Get("k1")
	if ok {
		t.Fatal("partitioned node should not receive data")
	}
}

func TestNetworkSim_HealResumesGossip(t *testing.T) {
	ns := NewNetworkSim(42)
	ns.AddNode("n1", 1)
	ns.AddNode("n2", 1)
	ns.GetStore("n1").Put("k1", []byte("v1"))

	ns.Partition("n1", "n2")
	for i := 0; i < 5; i++ {
		ns.RunGossipRound()
	}

	ns.Heal("n1", "n2")
	for i := 0; i < 20; i++ {
		ns.RunGossipRound()
		if ns.Converged() {
			return
		}
	}
	t.Fatal("should converge after heal")
}

func TestNetworkSim_DropRate(t *testing.T) {
	ns := NewNetworkSim(42)
	for i := 0; i < 5; i++ {
		ns.AddNode(fmt.Sprintf("n%d", i), 2)
	}
	ns.GetStore("n0").Put("k", []byte("v"))
	ns.SetDropRate(0.5)

	var totalDropped int
	for i := 0; i < 50; i++ {
		result := ns.RunGossipRound()
		totalDropped += result.Dropped
	}
	if totalDropped == 0 {
		t.Fatal("expected some drops with 50% rate")
	}
}

func TestNetworkSim_MerkleSync(t *testing.T) {
	ns := NewNetworkSim(42)
	ns.AddNode("n1", 1)
	ns.AddNode("n2", 1)
	ns.GetStore("n1").Put("mk1", []byte("mv1"))
	ns.GetStore("n2").Put("mk2", []byte("mv2"))

	for i := 0; i < 20; i++ {
		ns.RunMerkleSyncRound()
		if ns.Converged() {
			return
		}
	}
	t.Fatal("merkle sync should achieve convergence")
}

func TestNetworkSim_EventLog(t *testing.T) {
	ns := NewNetworkSim(42)
	ns.AddNode("n1", 1)
	ns.AddNode("n2", 1)
	ns.RunGossipRound()
	log := ns.EventLog()
	if len(log) < 2 { // at least 2 join events
		t.Fatalf("expected at least 2 events, got %d", len(log))
	}
}

func TestNetworkSim_Clock(t *testing.T) {
	ns := NewNetworkSim(42)
	ns.AddNode("n1", 1)
	ns.AddNode("n2", 1)
	if ns.Clock() != 0 {
		t.Fatal("initial clock should be 0")
	}
	ns.RunGossipRound()
	if ns.Clock() != 1 {
		t.Fatal("clock should advance each round")
	}
}

func TestNetworkSim_LargeCluster(t *testing.T) {
	ns := NewNetworkSim(42)
	for i := 0; i < 20; i++ {
		ns.AddNode(fmt.Sprintf("node-%02d", i), 3)
	}
	ns.GetStore("node-00").Put("shared", []byte("data"))

	for round := 0; round < 50; round++ {
		ns.RunGossipRound()
		if ns.Converged() {
			return
		}
	}
	t.Fatal("large cluster should converge")
}

func TestNetworkSim_SplitBrainRecovery(t *testing.T) {
	ns := NewNetworkSim(42)
	// Create two groups: {n0,n1} and {n2,n3}
	for i := 0; i < 4; i++ {
		ns.AddNode(fmt.Sprintf("n%d", i), 2)
	}

	// Partition into two groups
	ns.Partition("n0", "n2")
	ns.Partition("n0", "n3")
	ns.Partition("n1", "n2")
	ns.Partition("n1", "n3")

	// Each group writes different data
	ns.GetStore("n0").Put("group-a", []byte("alpha"))
	ns.GetStore("n2").Put("group-b", []byte("beta"))

	// Let each group gossip internally
	for i := 0; i < 10; i++ {
		ns.RunGossipRound()
	}

	// Heal all partitions
	ns.Heal("n0", "n2")
	ns.Heal("n0", "n3")
	ns.Heal("n1", "n2")
	ns.Heal("n1", "n3")

	// Gossip should converge all nodes
	for i := 0; i < 30; i++ {
		ns.RunGossipRound()
		if ns.Converged() {
			// Verify all data is present
			for j := 0; j < 4; j++ {
				store := ns.GetStore(fmt.Sprintf("n%d", j))
				_, ok1 := store.Get("group-a")
				_, ok2 := store.Get("group-b")
				if !ok1 || !ok2 {
					t.Fatalf("n%d missing data after split-brain recovery", j)
				}
			}
			return
		}
	}
	t.Fatal("split-brain recovery should converge")
}
