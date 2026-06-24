package main

import (
	"fmt"
	"sync"
	"time"

	"github.com/libp2p/go-libp2p/core/peer"
)

// CRDTAllowlistEntry is one peer in the LWW allowlist.
// A peer is active iff AddedAt > RemovedAt.
type CRDTAllowlistEntry struct {
	Name      string `json:"name"`
	AddedAt   int64  `json:"addedAt"`
	RemovedAt int64  `json:"removedAt"`
	Multiaddr string `json:"multiaddr,omitempty"`
}

// IsActive reports whether this entry represents a currently allowed peer.
func (e CRDTAllowlistEntry) IsActive() bool {
	return e.AddedAt > e.RemovedAt
}

// CRDTAllowlistState is the serializable CRDT snapshot for persistence and wire.
type CRDTAllowlistState struct {
	Version int                           `json:"version"`
	Entries map[string]CRDTAllowlistEntry `json:"entries"`
}

// CRDTAllowlist is the in-memory CRDT allowlist with LWW conflict resolution.
// It replaces PeerAllowlist, providing the same IsAllowed/FriendlyName API
// plus timestamp-based add/remove and merge for gossip.
type CRDTAllowlist struct {
	mu      sync.RWMutex
	entries map[peer.ID]CRDTAllowlistEntry
}

// NewCRDTAllowlist creates an empty CRDT allowlist.
func NewCRDTAllowlist() *CRDTAllowlist {
	return &CRDTAllowlist{entries: make(map[peer.ID]CRDTAllowlistEntry)}
}

// FriendlyName returns the display name for an active allowlisted peer.
func (a *CRDTAllowlist) FriendlyName(id peer.ID) (string, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	e, ok := a.entries[id]
	if !ok || !e.IsActive() {
		return "", false
	}
	return e.Name, true
}

// IsAllowed reports whether id is active in the allowlist.
func (a *CRDTAllowlist) IsAllowed(id peer.ID) bool {
	a.mu.RLock()
	defer a.mu.RUnlock()
	e, ok := a.entries[id]
	return ok && e.IsActive()
}

// Add inserts or re-activates a peer with the current wall clock as AddedAt.
func (a *CRDTAllowlist) Add(id peer.ID, friendlyName string) {
	a.AddAt(id, friendlyName, time.Now().UnixMilli())
}

// AddAt inserts or re-activates a peer at the given timestamp.
func (a *CRDTAllowlist) AddAt(id peer.ID, friendlyName string, ts int64) {
	a.mu.Lock()
	defer a.mu.Unlock()
	e := a.entries[id]
	if ts > e.AddedAt {
		e.AddedAt = ts
		e.Name = friendlyName
	}
	a.entries[id] = e
}

// Remove marks a peer as removed at the current wall clock.
func (a *CRDTAllowlist) Remove(id peer.ID) {
	a.RemoveAt(id, time.Now().UnixMilli())
}

// RemoveAt marks a peer as removed at the given timestamp.
func (a *CRDTAllowlist) RemoveAt(id peer.ID, ts int64) {
	a.mu.Lock()
	defer a.mu.Unlock()
	e := a.entries[id]
	if ts > e.RemovedAt {
		e.RemovedAt = ts
	}
	a.entries[id] = e
}

// SetMultiaddr updates the dial hint for a peer.
func (a *CRDTAllowlist) SetMultiaddr(id peer.ID, maddr string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	e, ok := a.entries[id]
	if !ok {
		return
	}
	e.Multiaddr = maddr
	a.entries[id] = e
}

// Len returns the number of active peers.
func (a *CRDTAllowlist) Len() int {
	a.mu.RLock()
	defer a.mu.RUnlock()
	n := 0
	for _, e := range a.entries {
		if e.IsActive() {
			n++
		}
	}
	return n
}

// ReplaceFromStrings rebuilds the allowlist from a legacy v1 map (peer ID string → name).
// All entries get AddedAt = ts, RemovedAt = 0.
func (a *CRDTAllowlist) ReplaceFromStrings(m map[string]string, ts int64) error {
	next := make(map[peer.ID]CRDTAllowlistEntry, len(m))
	for s, name := range m {
		id, err := peer.Decode(s)
		if err != nil {
			return fmt.Errorf("allowlist entry %q: %w", s, err)
		}
		next[id] = CRDTAllowlistEntry{Name: name, AddedAt: ts}
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	a.entries = next
	return nil
}

// ToStringMap returns active peers as a simple map (for backward compat).
func (a *CRDTAllowlist) ToStringMap() map[string]string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	out := make(map[string]string)
	for id, e := range a.entries {
		if e.IsActive() {
			out[id.String()] = e.Name
		}
	}
	return out
}

// State returns a serializable snapshot of the full CRDT state (including removed entries).
func (a *CRDTAllowlist) State() *CRDTAllowlistState {
	a.mu.RLock()
	defer a.mu.RUnlock()
	entries := make(map[string]CRDTAllowlistEntry, len(a.entries))
	for id, e := range a.entries {
		entries[id.String()] = e
	}
	return &CRDTAllowlistState{Version: 2, Entries: entries}
}

// LoadFromState replaces the in-memory state from a deserialized CRDTAllowlistState.
func (a *CRDTAllowlist) LoadFromState(state *CRDTAllowlistState) error {
	if state == nil {
		return nil
	}
	next := make(map[peer.ID]CRDTAllowlistEntry, len(state.Entries))
	for s, e := range state.Entries {
		id, err := peer.Decode(s)
		if err != nil {
			return fmt.Errorf("allowlist entry %q: %w", s, err)
		}
		next[id] = e
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	a.entries = next
	return nil
}

// Merge applies remote CRDT state using per-entry LWW (max AddedAt, max RemovedAt).
// selfID is excluded from merge results (a node never adds itself).
// Returns peers that became newly active and peers that became newly inactive.
func (a *CRDTAllowlist) Merge(remote *CRDTAllowlistState, selfID peer.ID) (newlyActive, newlyInactive []peer.ID) {
	if remote == nil {
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	for pidStr, re := range remote.Entries {
		pid, err := peer.Decode(pidStr)
		if err != nil {
			continue
		}
		if pid == selfID {
			continue
		}
		le := a.entries[pid]
		wasBefore := le.IsActive()

		changed := false
		if re.AddedAt > le.AddedAt {
			le.AddedAt = re.AddedAt
			le.Name = re.Name
			if re.Multiaddr != "" {
				le.Multiaddr = re.Multiaddr
			}
			changed = true
		}
		if re.RemovedAt > le.RemovedAt {
			le.RemovedAt = re.RemovedAt
			changed = true
		}
		if !changed && re.Multiaddr != "" && le.Multiaddr == "" {
			le.Multiaddr = re.Multiaddr
			changed = true
		}

		if changed {
			a.entries[pid] = le
		}

		isNow := le.IsActive()
		if !wasBefore && isNow {
			newlyActive = append(newlyActive, pid)
		} else if wasBefore && !isNow {
			newlyInactive = append(newlyInactive, pid)
		}
	}
	return
}

// ActivePeers returns a snapshot of all active peer IDs.
func (a *CRDTAllowlist) ActivePeers() []peer.ID {
	a.mu.RLock()
	defer a.mu.RUnlock()
	var out []peer.ID
	for id, e := range a.entries {
		if e.IsActive() {
			out = append(out, id)
		}
	}
	return out
}

// Entry returns the raw CRDT entry for a peer (for inspection/testing).
func (a *CRDTAllowlist) Entry(id peer.ID) (CRDTAllowlistEntry, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	e, ok := a.entries[id]
	return e, ok
}

// MultiaddrHint returns the stored multiaddr hint for a peer.
func (a *CRDTAllowlist) MultiaddrHint(id peer.ID) string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.entries[id].Multiaddr
}
