package gossip

import (
	"crypto/sha256"
	"encoding/binary"
	"sort"
	"sync"
)

// StateEntry represents a single key-value pair in the gossip state.
type StateEntry struct {
	Key       string
	Value     []byte
	Version   uint64
	NodeID    string
	Tombstone bool
}

// Digest is a compact summary of state for push-pull negotiation.
// It contains key → version mappings without the full values.
type Digest struct {
	Entries map[string]DigestEntry
}

// DigestEntry summarizes one key's version info.
type DigestEntry struct {
	Version uint64
	NodeID  string
}

// NewDigest creates an empty digest.
func NewDigest() *Digest {
	return &Digest{Entries: make(map[string]DigestEntry)}
}

// StateStore holds the replicated state for a gossip node.
// It supports get, put, delete, and diff operations needed by the gossip protocol.
type StateStore struct {
	mu      sync.RWMutex
	nodeID  string
	entries map[string]*StateEntry
	version uint64
}

// NewStateStore creates a store for the given node.
func NewStateStore(nodeID string) *StateStore {
	return &StateStore{
		nodeID:  nodeID,
		entries: make(map[string]*StateEntry),
	}
}

// Put sets a key-value pair, incrementing the version.
func (s *StateStore) Put(key string, value []byte) uint64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.version++
	s.entries[key] = &StateEntry{
		Key:     key,
		Value:   copyBytes(value),
		Version: s.version,
		NodeID:  s.nodeID,
	}
	return s.version
}

// Get retrieves a value by key. Returns nil, false if not found or tombstoned.
func (s *StateStore) Get(key string) ([]byte, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.entries[key]
	if !ok || e.Tombstone {
		return nil, false
	}
	return copyBytes(e.Value), true
}

// Delete marks a key as tombstoned.
func (s *StateStore) Delete(key string) uint64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.version++
	s.entries[key] = &StateEntry{
		Key:       key,
		Value:     nil,
		Version:   s.version,
		NodeID:    s.nodeID,
		Tombstone: true,
	}
	return s.version
}

// GetEntry returns the full StateEntry for a key (including tombstones).
func (s *StateStore) GetEntry(key string) (*StateEntry, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.entries[key]
	if !ok {
		return nil, false
	}
	cp := *e
	cp.Value = copyBytes(e.Value)
	return &cp, true
}

// Digest builds a compact summary of all entries.
func (s *StateStore) Digest() *Digest {
	s.mu.RLock()
	defer s.mu.RUnlock()
	d := NewDigest()
	for key, entry := range s.entries {
		d.Entries[key] = DigestEntry{Version: entry.Version, NodeID: entry.NodeID}
	}
	return d
}

// Diff returns entries that are newer than those in the given digest.
// These are the entries that the remote peer is missing or has stale versions of.
func (s *StateStore) Diff(remote *Digest) []*StateEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*StateEntry
	for key, entry := range s.entries {
		rd, ok := remote.Entries[key]
		if !ok || entry.Version > rd.Version {
			cp := *entry
			cp.Value = copyBytes(entry.Value)
			result = append(result, &cp)
		}
	}
	return result
}

// Apply merges a set of remote entries into the local store.
// Only entries with a higher version than the local entry are accepted.
// Returns the number of entries that were actually applied.
func (s *StateStore) Apply(entries []*StateEntry) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	applied := 0
	for _, remote := range entries {
		local, ok := s.entries[remote.Key]
		if !ok || remote.Version > local.Version {
			cp := *remote
			cp.Value = copyBytes(remote.Value)
			s.entries[remote.Key] = &cp
			if cp.Version > s.version {
				s.version = cp.Version
			}
			applied++
		}
	}
	return applied
}

// Keys returns all non-tombstoned keys.
func (s *StateStore) Keys() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var keys []string
	for k, e := range s.entries {
		if !e.Tombstone {
			keys = append(keys, k)
		}
	}
	sort.Strings(keys)
	return keys
}

// Len returns the count of non-tombstoned entries.
func (s *StateStore) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	count := 0
	for _, e := range s.entries {
		if !e.Tombstone {
			count++
		}
	}
	return count
}

// Hash returns a SHA-256 hash of the entire state for comparison.
func (s *StateStore) Hash() [32]byte {
	s.mu.RLock()
	defer s.mu.RUnlock()
	keys := make([]string, 0, len(s.entries))
	for k := range s.entries {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	h := sha256.New()
	for _, k := range keys {
		e := s.entries[k]
		h.Write([]byte(k))
		var vbuf [8]byte
		binary.BigEndian.PutUint64(vbuf[:], e.Version)
		h.Write(vbuf[:])
		h.Write(e.Value)
		if e.Tombstone {
			h.Write([]byte{1})
		} else {
			h.Write([]byte{0})
		}
	}
	var result [32]byte
	copy(result[:], h.Sum(nil))
	return result
}

// PurgeTombstones removes all tombstoned entries older than maxVersion.
func (s *StateStore) PurgeTombstones(maxVersion uint64) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	purged := 0
	for key, entry := range s.entries {
		if entry.Tombstone && entry.Version <= maxVersion {
			delete(s.entries, key)
			purged++
		}
	}
	return purged
}

func copyBytes(b []byte) []byte {
	if b == nil {
		return nil
	}
	cp := make([]byte, len(b))
	copy(cp, b)
	return cp
}