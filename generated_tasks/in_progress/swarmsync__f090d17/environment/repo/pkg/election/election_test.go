package election

import "testing"

func TestBully_HighestWins(t *testing.T) {
	be := NewBullyElection("node-2")
	be.AddPeer("node-1"); be.AddPeer("node-3")
	leader := be.RunElection()
	if leader != "node-3" { t.Fatalf("expected node-3, got %s", leader) }
}

func TestBully_SelfIsHighest(t *testing.T) {
	be := NewBullyElection("node-z")
	be.AddPeer("node-a"); be.AddPeer("node-b")
	be.RunElection()
	if !be.IsLeader() { t.Fatal("should be leader") }
}

func TestBully_DeadPeerSkipped(t *testing.T) {
	be := NewBullyElection("node-2")
	be.AddPeer("node-3")
	be.MarkDead("node-3")
	leader := be.RunElection()
	if leader != "node-2" { t.Fatalf("dead peer should be skipped, got %s", leader) }
}

func TestBully_ReElection(t *testing.T) {
	be := NewBullyElection("node-1")
	be.AddPeer("node-5")
	be.RunElection()
	if be.Leader() != "node-5" { t.Fatal("node-5 should lead") }
	be.MarkDead("node-5")
	be.RunElection()
	if be.Leader() != "node-1" { t.Fatal("node-1 should lead after node-5 dies") }
}

func TestBully_Rounds(t *testing.T) {
	be := NewBullyElection("n")
	be.RunElection(); be.RunElection()
	if be.Rounds() != 2 { t.Fatal("expected 2") }
}

func TestBully_PeerCount(t *testing.T) {
	be := NewBullyElection("n")
	be.AddPeer("a"); be.AddPeer("b")
	if be.PeerCount() != 2 { t.Fatal("expected 2") }
	be.RemovePeer("a")
	if be.PeerCount() != 1 { t.Fatal("expected 1") }
}

func TestBully_StateString(t *testing.T) {
	if StateFollower.String() != "follower" { t.Fatal("wrong") }
	if StateLeader.String() != "leader" { t.Fatal("wrong") }
	if StateCandidate.String() != "candidate" { t.Fatal("wrong") }
}

func TestRing_Elect(t *testing.T) {
	re := NewRingElection("node-2")
	re.SetRing([]string{"node-1", "node-2", "node-3"})
	leader := re.Elect()
	if leader != "node-3" { t.Fatalf("expected node-3, got %s", leader) }
}

func TestRing_DeadSkipped(t *testing.T) {
	re := NewRingElection("node-1")
	re.SetRing([]string{"node-1", "node-2", "node-3"})
	re.MarkDead("node-3")
	leader := re.Elect()
	if leader != "node-2" { t.Fatalf("expected node-2, got %s", leader) }
}
