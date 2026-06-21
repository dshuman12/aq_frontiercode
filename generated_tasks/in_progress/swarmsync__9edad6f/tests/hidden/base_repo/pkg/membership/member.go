package membership

import (
	"sync"
	"time"
)

// MemberState represents the lifecycle state of a cluster member.
type MemberState int

const (
	StateAlive    MemberState = iota
	StateSuspect
	StateDead
	StateLeft
)

// String returns a human-readable state name.
func (s MemberState) String() string {
	switch s {
	case StateAlive:
		return "alive"
	case StateSuspect:
		return "suspect"
	case StateDead:
		return "dead"
	case StateLeft:
		return "left"
	default:
		return "unknown"
	}
}

// Member represents a node in the cluster membership list.
type Member struct {
	ID          string
	State       MemberState
	Incarnation uint64
	LastUpdated time.Time
	Meta        map[string]string
}

// NewMember creates a member in the Alive state.
func NewMember(id string) *Member {
	return &Member{
		ID:          id,
		State:       StateAlive,
		Incarnation: 0,
		LastUpdated: time.Now(),
		Meta:        make(map[string]string),
	}
}

// Clone returns a deep copy.
func (m *Member) Clone() *Member {
	meta := make(map[string]string, len(m.Meta))
	for k, v := range m.Meta {
		meta[k] = v
	}
	return &Member{
		ID:          m.ID,
		State:       m.State,
		Incarnation: m.Incarnation,
		LastUpdated: m.LastUpdated,
		Meta:        meta,
	}
}

// MemberList maintains the set of known members and their states.
type MemberList struct {
	mu      sync.RWMutex
	selfID  string
	members map[string]*Member
}

// NewMemberList creates a list with the local node already registered as alive.
func NewMemberList(selfID string) *MemberList {
	ml := &MemberList{
		selfID:  selfID,
		members: make(map[string]*Member),
	}
	ml.members[selfID] = NewMember(selfID)
	return ml
}

// Self returns the local member.
func (ml *MemberList) Self() *Member {
	ml.mu.RLock()
	defer ml.mu.RUnlock()
	return ml.members[ml.selfID].Clone()
}

// Get returns a member by ID, or nil if not found.
func (ml *MemberList) Get(id string) *Member {
	ml.mu.RLock()
	defer ml.mu.RUnlock()
	m, ok := ml.members[id]
	if !ok {
		return nil
	}
	return m.Clone()
}

// Alive marks a node as alive. If the node is new, it is added.
// If the node exists and the incoming incarnation is higher, the state is updated.
// Returns true if the membership changed.
func (ml *MemberList) Alive(id string, incarnation uint64, meta map[string]string) bool {
	ml.mu.Lock()
	defer ml.mu.Unlock()
	m, exists := ml.members[id]
	if !exists {
		ml.members[id] = &Member{
			ID:          id,
			State:       StateAlive,
			Incarnation: incarnation,
			LastUpdated: time.Now(),
			Meta:        copyMeta(meta),
		}
		return true
	}
	if incarnation > m.Incarnation {
		m.State = StateAlive
		m.Incarnation = incarnation
		m.LastUpdated = time.Now()
		if meta != nil {
			m.Meta = copyMeta(meta)
		}
		return true
	}
	if incarnation == m.Incarnation && m.State == StateSuspect {
		m.State = StateAlive
		m.LastUpdated = time.Now()
		return true
	}
	return false
}

// Suspect marks a node as suspected of failure.
// Only applies if incarnation >= current incarnation.
// If this is the local node, it refutes by incrementing its own incarnation.
func (ml *MemberList) Suspect(id string, incarnation uint64) bool {
	ml.mu.Lock()
	defer ml.mu.Unlock()
	m, ok := ml.members[id]
	if !ok {
		return false
	}
	if id == ml.selfID {
		m.Incarnation++
		m.State = StateAlive
		m.LastUpdated = time.Now()
		return true
	}
	if incarnation >= m.Incarnation && m.State == StateAlive {
		m.State = StateSuspect
		m.Incarnation = incarnation
		m.LastUpdated = time.Now()
		return true
	}
	return false
}

// Dead marks a node as confirmed dead. Only applies if incarnation >= current.
func (ml *MemberList) Dead(id string, incarnation uint64) bool {
	ml.mu.Lock()
	defer ml.mu.Unlock()
	m, ok := ml.members[id]
	if !ok {
		return false
	}
	if id == ml.selfID {
		m.Incarnation++
		m.State = StateAlive
		m.LastUpdated = time.Now()
		return true
	}
	if incarnation >= m.Incarnation && m.State != StateDead && m.State != StateLeft {
		m.State = StateDead
		m.Incarnation = incarnation
		m.LastUpdated = time.Now()
		return true
	}
	return false
}

// Leave marks the local node as voluntarily leaving the cluster.
func (ml *MemberList) Leave() {
	ml.mu.Lock()
	defer ml.mu.Unlock()
	m := ml.members[ml.selfID]
	m.State = StateLeft
	m.Incarnation++
	m.LastUpdated = time.Now()
}

// AliveMembers returns IDs of all members in the Alive state (excluding self if skipSelf is true).
func (ml *MemberList) AliveMembers(skipSelf bool) []string {
	ml.mu.RLock()
	defer ml.mu.RUnlock()
	var result []string
	for id, m := range ml.members {
		if m.State == StateAlive {
			if skipSelf && id == ml.selfID {
				continue
			}
			result = append(result, id)
		}
	}
	return result
}

// AllMembers returns a copy of all members.
func (ml *MemberList) AllMembers() []*Member {
	ml.mu.RLock()
	defer ml.mu.RUnlock()
	result := make([]*Member, 0, len(ml.members))
	for _, m := range ml.members {
		result = append(result, m.Clone())
	}
	return result
}

// Len returns the total number of members (all states).
func (ml *MemberList) Len() int {
	ml.mu.RLock()
	defer ml.mu.RUnlock()
	return len(ml.members)
}

// RemoveDead removes all members in the Dead state.
func (ml *MemberList) RemoveDead() int {
	ml.mu.Lock()
	defer ml.mu.Unlock()
	removed := 0
	for id, m := range ml.members {
		if m.State == StateDead && id != ml.selfID {
			delete(ml.members, id)
			removed++
		}
	}
	return removed
}

// SuspectMembers returns IDs of all members in the Suspect state.
func (ml *MemberList) SuspectMembers() []string {
	ml.mu.RLock()
	defer ml.mu.RUnlock()
	var result []string
	for id, m := range ml.members {
		if m.State == StateSuspect {
			result = append(result, id)
		}
	}
	return result
}

func copyMeta(m map[string]string) map[string]string {
	if m == nil {
		return make(map[string]string)
	}
	cp := make(map[string]string, len(m))
	for k, v := range m {
		cp[k] = v
	}
	return cp
}