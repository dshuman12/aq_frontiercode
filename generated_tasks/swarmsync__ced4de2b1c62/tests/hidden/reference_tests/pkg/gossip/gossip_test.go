package gossip

import (
	"fmt"
	"sync"
	"testing"
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

// --- Delete propagation (adversarial) ---

// TestStateStore_TombstoneIncludedInDiff verifies that Diff includes tombstoned
// entries so that deletions propagate to peers that still hold the live value.
func TestStateStore_TombstoneIncludedInDiff(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("gone", []byte("was here"))
	s.Delete("gone")

	// A completely empty remote digest — knows nothing
	entries := s.Diff(NewDigest())
	found := false
	for _, e := range entries {
		if e.Key == "gone" && e.Tombstone {
			found = true
		}
	}
	if !found {
		t.Fatal("Diff must include tombstones so peers can learn about deletions")
	}
}

// TestStateStore_TombstoneIncludedInDiffVsStaleDigest verifies that Diff sends
// the tombstone even when the remote digest already has the live version of the key.
func TestStateStore_TombstoneIncludedInDiffVsStaleDigest(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("gone", []byte("was here")) // version 1
	s.Delete("gone")                  // version 2 (tombstone)

	// Remote knows the live version (v1) but not the tombstone
	stale := NewDigest()
	stale.Entries["gone"] = DigestEntry{Version: 1, NodeID: "n1"}

	entries := s.Diff(stale)
	found := false
	for _, e := range entries {
		if e.Key == "gone" && e.Tombstone {
			found = true
		}
	}
	if !found {
		t.Fatal("Diff must include tombstone when remote has an older live version of the key")
	}
}

// TestStateStore_ApplyTombstoneOverLiveEntry verifies that Apply accepts a
// tombstone entry even when the local store already holds a live value for
// the same key, provided the tombstone carries a higher version.
func TestStateStore_ApplyTombstoneOverLiveEntry(t *testing.T) {
	s := NewStateStore("n1")
	s.Put("x", []byte("live")) // version 1

	tombstone := &StateEntry{
		Key:       "x",
		Version:   2, // newer than the live entry
		NodeID:    "n2",
		Tombstone: true,
	}
	applied := s.Apply([]*StateEntry{tombstone})
	if applied != 1 {
		t.Fatalf("expected tombstone to be applied (count=1), got %d", applied)
	}
	_, ok := s.Get("x")
	if ok {
		t.Fatal("key must be absent after applying tombstone over live entry")
	}
}

// TestStateStore_DeletePropagatesViaPush verifies the full Push path: the
// deleting node pushes its state to a peer that holds the live value; after
// the push the peer must see the key as deleted.
func TestStateStore_DeletePropagatesViaPush(t *testing.T) {
	// Setup: both nodes know about "shared"
	deleter := NewStateStore("n1")
	peer := NewStateStore("n2")
	deleter.Put("shared", []byte("data"))
	peer.Put("shared", []byte("data"))

	// Deleter removes it
	deleter.Delete("shared")

	// Push deleter's state to peer
	proto := NewProtocol("n1", deleter, NewRandomPeerSelector(1), 1)
	proto.Push(peer)

	_, ok := peer.Get("shared")
	if ok {
		t.Fatal("after push, peer must not see a key that was deleted on the sender")
	}
}

// TestStateStore_DeleteThenReaddConverges verifies that after a deletion
// propagates, a subsequent re-add also propagates and wins (it carries a
// higher version than the tombstone).
func TestStateStore_DeleteThenReaddConverges(t *testing.T) {
	a := NewStateStore("n1")
	b := NewStateStore("n2")
	a.Put("k", []byte("v1"))
	b.Put("k", []byte("v1"))
	a.Delete("k")

	proto := NewProtocol("n1", a, NewRandomPeerSelector(1), 1)
	proto.Push(b)

	_, ok := b.Get("k")
	if ok {
		t.Fatal("deletion must propagate: b should not see k after push")
	}

	// Re-add on a
	a.Put("k", []byte("v2"))
	proto.Push(b)

	val, ok := b.Get("k")
	if !ok {
		t.Fatal("re-add after delete must propagate to b")
	}
	if string(val) != "v2" {
		t.Fatalf("expected v2 after re-add, got %s", val)
	}
}

// TestCluster_DeleteOnOneNodeConvergesToAllPeers verifies that a deletion on
// one node propagates to all other nodes through gossip, even when the other
// nodes have a live copy of the key and never directly gossip with the deleter.
func TestCluster_DeleteOnOneNodeConvergesToAllPeers(t *testing.T) {
	const keyToDelete = "target"

	n1 := NewStateStore("n1")
	n2 := NewStateStore("n2")
	n3 := NewStateStore("n3")

	// All three nodes start with the key
	n1.Put(keyToDelete, []byte("value"))
	n2.Put(keyToDelete, []byte("value"))
	n3.Put(keyToDelete, []byte("value"))

	// Full initial sync so all have the same base state
	p1 := NewProtocol("n1", n1, NewRandomPeerSelector(1), 2)
	p2 := NewProtocol("n2", n2, NewRandomPeerSelector(2), 2)
	p3 := NewProtocol("n3", n3, NewRandomPeerSelector(3), 2)
	c := NewCluster()
	c.AddNode("n1", p1)
	c.AddNode("n2", p2)
	c.AddNode("n3", p3)
	for i := 0; i < 5; i++ {
		c.RunRound()
	}

	// n1 deletes the key
	n1.Delete(keyToDelete)

	// Run gossip until converged
	converged := false
	for i := 0; i < 20; i++ {
		c.RunRound()
		if c.Converged() {
			converged = true
			break
		}
	}
	if !converged {
		t.Fatal("cluster did not converge after deletion")
	}

	for name, store := range map[string]*StateStore{"n1": n1, "n2": n2, "n3": n3} {
		if _, ok := store.Get(keyToDelete); ok {
			t.Fatalf("node %s still sees %q after deletion converged", name, keyToDelete)
		}
	}
}