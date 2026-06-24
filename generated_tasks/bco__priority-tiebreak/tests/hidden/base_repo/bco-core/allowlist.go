package main

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"sort"
	"sync"

	"github.com/libp2p/go-libp2p/core/peer"
)

// PeerAllowlist is kept as a type alias for backward compatibility with tests.
// New code should use CRDTAllowlist directly.
type PeerAllowlist = CRDTAllowlist

// NewPeerAllowlist creates an empty CRDT allowlist (backward-compatible constructor).
func NewPeerAllowlist() *CRDTAllowlist {
	return NewCRDTAllowlist()
}

// LoadAllowlistFromStorage loads allowlist.json (v1 or v2) from storagePath into a.
func LoadAllowlistFromStorage(a *CRDTAllowlist, storagePath string) error {
	state, err := LoadCRDTAllowlistFile(storagePath)
	if err != nil {
		return err
	}
	return a.LoadFromState(state)
}

// SaveAllowlistToStorage writes the CRDT allowlist to allowlist.json (v2 format).
func SaveAllowlistToStorage(a *CRDTAllowlist, storagePath string) error {
	return SaveCRDTAllowlistFile(storagePath, a.State())
}

// PendingPairing holds pairing metadata for unknown inbound peers (no network I/O).
type PendingPairing struct {
	mu   sync.Mutex
	data map[peer.ID]PendingPeerInfo
}

// PendingPeerInfo is surfaced later as PAIRING_REQUEST events.
type PendingPeerInfo struct {
	CompareCode    string
	Fingerprint    string
	PeerName       string
	Platform       string
	TargetBTDevice string
}

// NewPendingPairing creates an empty pending map.
func NewPendingPairing() *PendingPairing {
	return &PendingPairing{data: make(map[peer.ID]PendingPeerInfo)}
}

// Stage records pairing info for a peer awaiting approval.
func (p *PendingPairing) Stage(id peer.ID, info PendingPeerInfo) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.data[id] = info
}

// Remove drops a pending entry.
func (p *PendingPairing) Remove(id peer.ID) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.data, id)
}

// Get returns pending info if present.
func (p *PendingPairing) Get(id peer.ID) (PendingPeerInfo, bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	v, ok := p.data[id]
	return v, ok
}

// PairCompareCode returns the canonical 6-digit compare code for two peer IDs (research.md).
func PairCompareCode(a, b peer.ID) string {
	ids := []string{a.String(), b.String()}
	sort.Strings(ids)
	sum := sha256.Sum256([]byte(ids[0] + ids[1]))
	n := binary.BigEndian.Uint64(sum[:8]) % 1000000
	return fmt.Sprintf("%06d", n)
}

// PeerFingerprint is a short display fingerprint for pairing UX.
func PeerFingerprint(id peer.ID) string {
	s := id.String()
	if len(s) <= 16 {
		return s
	}
	return s[:8] + "..." + s[len(s)-8:]
}
