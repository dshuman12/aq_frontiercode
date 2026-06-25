package gossip

import (
	"fmt"
	"sync"
	"testing"
	"time"
)

// --- StateStore tests ---

func TestStateStore_PutGet(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("key1", []byte("value1"))
	v, ok := s.Get("key1")
	if !ok || string(v) != "value1" {
		t.Fatalf("expected (value1, true), got (%s, %v)", v, ok)
	}
}

func TestStateStore_GetMissing(t *testing.T) {
	s := NewStateStore("n1")
	_, ok := s.Get("missing")
	if ok {
		t.Fatal("expected false for missing key")
	}
}

func TestStateStore_PutOverwrite(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k", []byte("old"))
	s.Put("k", []byte("new"))
	v, _ := s.Get("k")
	if string(v) != "new" {
		t.Fatalf("expected new, got %s", v)
	}
}

func TestStateStore_Delete(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k", []byte("val"))
	s.Delete("k")
	_, ok := s.Get("k")
	if ok {
		t.Fatal("expected false after delete")
	}
}

func TestStateStore_DeleteThenPut(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k", []byte("v1"))
	s.Delete("k")
	s.Put("k", []byte("v2"))
	v, ok := s.Get("k")
	if !ok || string(v) != "v2" {
		t.Fatal("re-put after delete should work")
	}
}

func TestStateStore_Len(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("a", []byte("1"))
	s.Put("b", []byte("2"))
	s.Put("c", []byte("3"))
	if s.Len() != 3 {
		t.Fatalf("expected 3, got %d", s.Len())
	}
	s.Delete("b")
	if s.Len() != 2 {
		t.Fatalf("expected 2 after delete, got %d", s.Len())
	}
}

func TestStateStore_Keys(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("c", []byte("3"))
	s.Put("a", []byte("1"))
	s.Put("b", []byte("2"))
	keys := s.Keys()
	if len(keys) != 3 || keys[0] != "a" || keys[1] != "b" || keys[2] != "c" {
		t.Fatalf("expected sorted [a,b,c], got %v", keys)
	}
}

func TestStateStore_Digest(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k1", []byte("v1"))
	s.Put("k2", []byte("v2"))
	d := s.Digest()
	if len(d.Entries) != 2 {
		t.Fatalf("expected 2 digest entries, got %d", len(d.Entries))
	}
	if d.Entries["k1"].Version != 1 || d.Entries["k2"].Version != 2 {
		t.Fatal("version mismatch in digest")
	}
}

func TestStateStore_Diff(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k1", []byte("v1"))
	s.Put("k2", []byte("v2"))
	s.Put("k3", []byte("v3"))

	// Remote only knows k1@v1
	remote := NewDigest()
	remote.Entries["k1"] = DigestEntry{Version: 1, NodeID: "n1"}

	diff := s.Diff(remote)
	if len(diff) != 2 {
		t.Fatalf("expected 2 diff entries, got %d", len(diff))
	}
}

func TestStateStore_DiffEmpty(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k1", []byte("v1"))
	diff := s.Diff(NewDigest())
	if len(diff) != 1 {
		t.Fatalf("expected 1 entry vs empty digest, got %d", len(diff))
	}
}

func TestStateStore_Apply(t *testing.T) {
	s := NewStateStore("n1")
	entries := []*StateEntry{
		{Key: "k1", Value: []byte("v1"), Version: 1, NodeID: "n2"},
		{Key: "k2", Value: []byte("v2"), Version: 2, NodeID: "n2"},
	}
	applied := s.Apply(entries)
	if applied != 2 {
		t.Fatalf("expected 2 applied, got %d", applied)
	}
	v, _ := s.Get("k1")
	if string(v) != "v1" {
		t.Fatalf("expected v1, got %s", v)
	}
}

func TestStateStore_ApplyOlderIgnored(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k1", []byte("new")) // version 1
	old := []*StateEntry{
		{Key: "k1", Value: []byte("old"), Version: 0, NodeID: "n2"},
	}
	applied := s.Apply(old)
	if applied != 0 {
		t.Fatal("older version should be ignored")
	}
	v, _ := s.Get("k1")
	if string(v) != "new" {
		t.Fatal("value should not change")
	}
}

func TestStateStore_Hash(t *testing.T) {
	a := NewStateStore("n1")
	a.Put("k1", []byte("v1"))
	a.Put("k2", []byte("v2"))
	b := NewStateStore("n2")
	b.Put("k1", []byte("v1"))
	b.Put("k2", []byte("v2"))
	if a.Hash() != b.Hash() {
		t.Fatal("identical state should produce identical hash")
	}
}

func TestStateStore_HashDiffers(t *testing.T) {
	a := NewStateStore("n1")
	a.Put("k1", []byte("v1"))
	b := NewStateStore("n2")
	b.Put("k1", []byte("v2"))
	if a.Hash() == b.Hash() {
		t.Fatal("different state should produce different hash")
	}
}

func TestStateStore_PurgeTombstones(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k1", []byte("v1")) // version 1
	s.Delete("k1")            // version 2 (tombstone)
	s.Put("k2", []byte("v2")) // version 3

	purged := s.PurgeTombstones(2)
	if purged != 1 {
		t.Fatalf("expected 1 purged, got %d", purged)
	}
	_, ok := s.GetEntry("k1")
	if ok {
		t.Fatal("tombstone should be purged")
	}
}

func TestStateStore_GetEntry(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k", []byte("val"))
	e, ok := s.GetEntry("k")
	if !ok || string(e.Value) != "val" || e.Version != 1 {
		t.Fatal("entry mismatch")
	}
}

func TestStateStore_ThreadSafety(t *testing.T) {
	s := NewStateStore("n1")
	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		i := i
		go func() {
			defer wg.Done()
			key := fmt.Sprintf("key-%d", i)
			s.Put(key, []byte(fmt.Sprintf("val-%d", i)))
		}()
	}
	wg.Wait()
	if s.Len() != 50 {
		t.Fatalf("expected 50, got %d", s.Len())
	}
}

// --- PeerSelector tests ---

func TestRandomPeerSelector_ExcludesSelf(t *testing.T) {
	sel := NewRandomPeerSelector(42)
	peers := sel.SelectPeers([]string{"a", "b", "c"}, "b", 5)
	for _, p := range peers {
		if p == "b" {
			t.Fatal("should not select self")
		}
	}
}

func TestRandomPeerSelector_MaxN(t *testing.T) {
	sel := NewRandomPeerSelector(42)
	peers := sel.SelectPeers([]string{"a", "b", "c", "d"}, "a", 2)
	if len(peers) != 2 {
		t.Fatalf("expected 2 peers, got %d", len(peers))
	}
}

func TestRandomPeerSelector_NoBeyondAvailable(t *testing.T) {
	sel := NewRandomPeerSelector(42)
	peers := sel.SelectPeers([]string{"a", "b"}, "a", 10)
	if len(peers) != 1 {
		t.Fatalf("expected 1 peer (only b available), got %d", len(peers))
	}
}

func TestRandomPeerSelector_EmptyList(t *testing.T) {
	sel := NewRandomPeerSelector(42)
	peers := sel.SelectPeers([]string{"a"}, "a", 5)
	if len(peers) != 0 {
		t.Fatal("expected no peers when only self available")
	}
}

// --- Protocol tests ---

func TestProtocol_PushPull_Convergence(t *testing.T) {
	s1 := NewStateStore("n1")
	s2 := NewStateStore("n2")
	s1.Put("from-n1", []byte("hello"))
	s2.Put("from-n2", []byte("world"))

	sel := NewRandomPeerSelector(1)
	p1 := NewProtocol("n1", s1, sel, 1)
	p1.PushPull(s2)

	v1, ok := s1.Get("from-n2")
	if !ok || string(v1) != "world" {
		t.Fatal("n1 should have pulled from-n2")
	}
	v2, ok := s2.Get("from-n1")
	if !ok || string(v2) != "hello" {
		t.Fatal("n2 should have received from-n1")
	}
}

func TestProtocol_Push(t *testing.T) {
	s1 := NewStateStore("n1")
	s2 := NewStateStore("n2")
	s1.Put("k", []byte("v"))

	sel := NewRandomPeerSelector(1)
	p1 := NewProtocol("n1", s1, sel, 1)
	pushed := p1.Push(s2)
	if pushed != 1 {
		t.Fatalf("expected 1 pushed, got %d", pushed)
	}
	v, ok := s2.Get("k")
	if !ok || string(v) != "v" {
		t.Fatal("push should transfer entry")
	}
}

func TestProtocol_Pull(t *testing.T) {
	s1 := NewStateStore("n1")
	s2 := NewStateStore("n2")
	s2.Put("k", []byte("v"))

	sel := NewRandomPeerSelector(1)
	p1 := NewProtocol("n1", s1, sel, 1)
	pulled := p1.Pull(s2)
	if pulled != 1 {
		t.Fatalf("expected 1 pulled, got %d", pulled)
	}
	v, ok := s1.Get("k")
	if !ok || string(v) != "v" {
		t.Fatal("pull should transfer entry")
	}
}

func TestProtocol_Rounds(t *testing.T) {
	s := NewStateStore("n1")
	sel := NewRandomPeerSelector(1)
	p := NewProtocol("n1", s, sel, 1)
	if p.Rounds() != 0 {
		t.Fatal("initial rounds should be 0")
	}
	p.PushPull(NewStateStore("n2"))
	p.Push(NewStateStore("n3"))
	if p.Rounds() != 2 {
		t.Fatalf("expected 2 rounds, got %d", p.Rounds())
	}
}

// --- Cluster tests ---

func TestCluster_Convergence(t *testing.T) {
	c := NewCluster()
	for i := 0; i < 5; i++ {
		nodeID := fmt.Sprintf("n%d", i)
		store := NewStateStore(nodeID)
		store.Put(fmt.Sprintf("key-%s", nodeID), []byte(fmt.Sprintf("val-%s", nodeID)))
		sel := NewRandomPeerSelector(int64(i))
		proto := NewProtocol(nodeID, store, sel, 2)
		c.AddNode(nodeID, proto)
	}

	// Run gossip rounds until convergence
	for round := 0; round < 20; round++ {
		c.RunRound()
		if c.Converged() {
			// Verify all nodes have all keys
			for i := 0; i < 5; i++ {
				nodeID := fmt.Sprintf("n%d", i)
				node := c.GetNode(nodeID)
				for j := 0; j < 5; j++ {
					key := fmt.Sprintf("key-n%d", j)
					_, ok := node.Store().Get(key)
					if !ok {
						t.Fatalf("node %s missing key %s after convergence", nodeID, key)
					}
				}
			}
			return
		}
	}
	t.Fatal("cluster did not converge in 20 rounds")
}

func TestCluster_Size(t *testing.T) {
	c := NewCluster()
	if c.Size() != 0 {
		t.Fatal("empty cluster should have size 0")
	}
	for i := 0; i < 3; i++ {
		nodeID := fmt.Sprintf("n%d", i)
		c.AddNode(nodeID, NewProtocol(nodeID, NewStateStore(nodeID), NewRandomPeerSelector(0), 1))
	}
	if c.Size() != 3 {
		t.Fatalf("expected 3, got %d", c.Size())
	}
}

func TestCluster_DeleteConvergence(t *testing.T) {
	c := NewCluster()
	for i := 0; i < 3; i++ {
		nodeID := fmt.Sprintf("n%d", i)
		store := NewStateStore(nodeID)
		c.AddNode(nodeID, NewProtocol(nodeID, store, NewRandomPeerSelector(int64(i)), 2))
	}

	// n0 puts then deletes a key
	c.GetNode("n0").Store().Put("ephemeral", []byte("temp"))
	c.RunRound()
	c.GetNode("n0").Store().Delete("ephemeral")

	for round := 0; round < 20; round++ {
		c.RunRound()
		if c.Converged() {
			// All nodes should have the tombstone
			for i := 0; i < 3; i++ {
				nodeID := fmt.Sprintf("n%d", i)
				_, ok := c.GetNode(nodeID).Store().Get("ephemeral")
				if ok {
					t.Fatalf("node %s should see deleted key", nodeID)
				}
			}
			return
		}
	}
	t.Fatal("cluster did not converge after delete")
}

func TestStateStore_HashCaching(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k1", []byte("v1"))
	h1 := s.Hash()
	h2 := s.Hash()
	if h1 != h2 {
		t.Fatal("consecutive Hash() calls should return same value")
	}

	s.Put("k2", []byte("v2"))
	h3 := s.Hash()
	if h1 == h3 {
		t.Fatal("hash should change after new Put")
	}
	h4 := s.Hash()
	if h3 != h4 {
		t.Fatal("hash should be cached after recompute")
	}
}

func TestStateStore_HashCaching_AfterApply(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k1", []byte("v1"))
	hBefore := s.Hash()

	remote := &StateEntry{Key: "k2", Value: []byte("v2"), Version: 100, NodeID: "n2"}
	s.Apply([]*StateEntry{remote})
	hAfter := s.Hash()
	if hBefore == hAfter {
		t.Fatal("hash should change after Apply")
	}
}

func TestStateStore_GetRef(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k", []byte("hello"))
	v, ok := s.GetRef("k")
	if !ok || string(v) != "hello" {
		t.Fatal("GetRef should return value without copy")
	}
	_, ok = s.GetRef("missing")
	if ok {
		t.Fatal("GetRef should return false for missing key")
	}
}

func TestStateStore_GetRef_Tombstone(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k", []byte("v"))
	s.Delete("k")
	_, ok := s.GetRef("k")
	if ok {
		t.Fatal("GetRef should return false for tombstoned key")
	}
}

func TestStateStore_HashCaching_AfterDelete(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("k1", []byte("v1"))
	h1 := s.Hash()
	s.Delete("k1")
	h2 := s.Hash()
	if h1 == h2 {
		t.Fatal("hash should change after Delete")
	}
}
// --- Stats tests ---

func TestStats_RecordPushPull(t *testing.T) {
	s := NewStats()
	s.RecordPushPull(5, 3)
	snap := s.Snapshot()
	if snap.Rounds != 1 { t.Fatal("expected 1 round") }
	if snap.EntriesPushed != 5 { t.Fatalf("expected 5 pushed, got %d", snap.EntriesPushed) }
	if snap.EntriesPulled != 3 { t.Fatalf("expected 3 pulled, got %d", snap.EntriesPulled) }
}

func TestStats_Uptime(t *testing.T) {
	s := NewStats()
	if s.Uptime() <= 0 { t.Fatal("uptime should be positive") }
}

func TestHealthMonitor_Basic(t *testing.T) {
	hm := NewHealthMonitor(time.Second)
	hm.RecordActivity("n1")
	if !hm.IsHealthy("n1") { t.Fatal("should be healthy") }
	if hm.IsHealthy("n2") { t.Fatal("unknown should be unhealthy") }
}

func TestHealthMonitor_NodeCount(t *testing.T) {
	hm := NewHealthMonitor(time.Second)
	hm.RecordActivity("n1")
	hm.RecordActivity("n2")
	if hm.NodeCount() != 2 { t.Fatal("expected 2") }
	hm.Remove("n1")
	if hm.NodeCount() != 1 { t.Fatal("expected 1") }
}

func TestHealthMonitor_HealthyNodes(t *testing.T) {
	hm := NewHealthMonitor(time.Second)
	hm.RecordActivity("n1")
	hm.RecordActivity("n2")
	healthy := hm.HealthyNodes()
	if len(healthy) != 2 { t.Fatalf("expected 2 healthy, got %d", len(healthy)) }
}

// --- AntiEntropy tests ---

func TestAntiEntropy_ShouldSync(t *testing.T) {
	s := NewAntiEntropyScheduler(3)
	if !s.ShouldSync("a", "b") { t.Fatal("should sync initially") }
	s.RecordSync("a", "b")
	if s.ShouldSync("a", "b") { t.Fatal("should not sync immediately after") }
	s.AdvanceRound(); s.AdvanceRound(); s.AdvanceRound()
	if !s.ShouldSync("a", "b") { t.Fatal("should sync after interval") }
}

func TestAntiEntropy_SymmetricPairKey(t *testing.T) {
	s := NewAntiEntropyScheduler(1)
	s.RecordSync("b", "a")
	if s.ShouldSync("a", "b") { t.Fatal("pair key should be symmetric") }
}

func TestAntiEntropy_Reset(t *testing.T) {
	s := NewAntiEntropyScheduler(1)
	s.RecordSync("a", "b"); s.AdvanceRound()
	s.Reset()
	if s.Round() != 0 { t.Fatal("round should be 0 after reset") }
	if s.PairsSynced() != 0 { t.Fatal("pairs should be 0 after reset") }
}
