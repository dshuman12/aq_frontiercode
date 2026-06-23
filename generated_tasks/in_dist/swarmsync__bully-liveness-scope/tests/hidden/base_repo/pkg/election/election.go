package election

import "sync"

// State represents the election state of a node.
type State int
const (
	StateFollower  State = iota
	StateCandidate
	StateLeader
)
func (s State) String() string {
	switch s {
	case StateFollower: return "follower"
	case StateCandidate: return "candidate"
	case StateLeader: return "leader"
	default: return "unknown"
	}
}

// BullyElection implements the Bully leader election algorithm.
// The node with the highest ID wins.
type BullyElection struct {
	mu       sync.Mutex
	selfID   string
	leaderID string
	state    State
	peers    map[string]bool
	alive    map[string]bool
	rounds   int
}

// NewBullyElection creates an election instance.
func NewBullyElection(selfID string) *BullyElection {
	return &BullyElection{
		selfID: selfID,
		state:  StateFollower,
		peers:  make(map[string]bool),
		alive:  make(map[string]bool),
	}
}

// AddPeer registers a peer.
func (be *BullyElection) AddPeer(id string) {
	be.mu.Lock()
	defer be.mu.Unlock()
	be.peers[id] = true
	be.alive[id] = true
}

// RemovePeer removes a peer and triggers re-election if it was leader.
func (be *BullyElection) RemovePeer(id string) {
	be.mu.Lock()
	defer be.mu.Unlock()
	delete(be.peers, id)
	delete(be.alive, id)
}

// MarkAlive marks a peer as alive.
func (be *BullyElection) MarkAlive(id string) {
	be.mu.Lock()
	defer be.mu.Unlock()
	if be.peers[id] { be.alive[id] = true }
}

// MarkDead marks a peer as dead.
func (be *BullyElection) MarkDead(id string) {
	be.mu.Lock()
	defer be.mu.Unlock()
	delete(be.alive, id)
}

// RunElection runs the bully algorithm. Returns the elected leader.
func (be *BullyElection) RunElection() string {
	be.mu.Lock()
	defer be.mu.Unlock()
	be.rounds++
	be.state = StateCandidate
	highestAlive := be.selfID
	for id := range be.peers {
		if id > highestAlive { highestAlive = id }
	}
	be.leaderID = highestAlive
	if highestAlive == be.selfID {
		be.state = StateLeader
	} else {
		be.state = StateFollower
	}
	return be.leaderID
}

// Leader returns the current leader.
func (be *BullyElection) Leader() string {
	be.mu.Lock()
	defer be.mu.Unlock()
	return be.leaderID
}

// State returns the current state.
func (be *BullyElection) CurrentState() State {
	be.mu.Lock()
	defer be.mu.Unlock()
	return be.state
}

// IsLeader returns true if this node is the leader.
func (be *BullyElection) IsLeader() bool {
	be.mu.Lock()
	defer be.mu.Unlock()
	return be.state == StateLeader
}

// SelfID returns this node's ID.
func (be *BullyElection) SelfID() string { return be.selfID }

// Rounds returns number of elections run.
func (be *BullyElection) Rounds() int {
	be.mu.Lock()
	defer be.mu.Unlock()
	return be.rounds
}

// PeerCount returns number of registered peers.
func (be *BullyElection) PeerCount() int {
	be.mu.Lock()
	defer be.mu.Unlock()
	return len(be.peers)
}

// AliveCount returns number of alive peers.
func (be *BullyElection) AliveCount() int {
	be.mu.Lock()
	defer be.mu.Unlock()
	return len(be.alive)
}

// RingElection implements the ring-based election algorithm.
type RingElection struct {
	mu       sync.Mutex
	selfID   string
	leaderID string
	ring     []string
	alive    map[string]bool
}

// NewRingElection creates a ring election instance.
func NewRingElection(selfID string) *RingElection {
	return &RingElection{selfID: selfID, alive: make(map[string]bool)}
}

// SetRing sets the ordered ring of node IDs.
func (re *RingElection) SetRing(ids []string) {
	re.mu.Lock()
	defer re.mu.Unlock()
	re.ring = make([]string, len(ids))
	copy(re.ring, ids)
	for _, id := range ids { re.alive[id] = true }
}

// MarkDead marks a node as dead.
func (re *RingElection) MarkDead(id string) {
	re.mu.Lock()
	defer re.mu.Unlock()
	delete(re.alive, id)
}

// Elect runs the ring election: forward to next alive, highest ID wins.
func (re *RingElection) Elect() string {
	re.mu.Lock()
	defer re.mu.Unlock()
	best := re.selfID
	for _, id := range re.ring {
		if re.alive[id] && id > best { best = id }
	}
	re.leaderID = best
	return best
}

// Leader returns the elected leader.
func (re *RingElection) Leader() string {
	re.mu.Lock()
	defer re.mu.Unlock()
	return re.leaderID
}
