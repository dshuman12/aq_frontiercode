package merkle

import (
	"crypto/sha256"
	"encoding/binary"
	"sort"
	"sync"
)

// Node represents a single node in the Merkle tree.
type Node struct {
	Hash     [32]byte
	Key      string // non-empty for leaf nodes
	Value    []byte // non-empty for leaf nodes
	Left     *Node
	Right    *Node
	IsLeaf   bool
}

// Tree is a binary Merkle tree built over a set of key-value pairs.
// It supports efficient diff computation between two trees to find
// the minimal set of keys that differ.
type Tree struct {
	mu    sync.RWMutex
	root  *Node
	data  map[string][]byte
	dirty bool
}

// NewTree creates an empty Merkle tree.
func NewTree() *Tree {
	return &Tree{data: make(map[string][]byte)}
}

// Put inserts or updates a key-value pair and rebuilds the tree.
func (t *Tree) Put(key string, value []byte) {
	t.mu.Lock()
	defer t.mu.Unlock()
	cp := make([]byte, len(value))
	copy(cp, value)
	t.data[key] = cp
	t.dirty = true
}

// PutBatch inserts multiple key-value pairs with a single tree rebuild.
// Far more efficient than calling Put repeatedly.
func (t *Tree) PutBatch(entries map[string][]byte) {
	t.mu.Lock()
	defer t.mu.Unlock()
	for k, v := range entries {
		cp := make([]byte, len(v))
		copy(cp, v)
		t.data[k] = cp
	}
	t.rebuild()
}

// Delete removes a key and rebuilds the tree.
func (t *Tree) Delete(key string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.data, key)
	t.dirty = true
}

// ensureBuilt rebuilds the tree if mutations have been made since the last build.
func (t *Tree) ensureBuilt() {
	if t.dirty {
		t.rebuild()
		t.dirty = false
	}
}

// Get returns the value for a key.
func (t *Tree) Get(key string) ([]byte, bool) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	v, ok := t.data[key]
	if !ok {
		return nil, false
	}
	cp := make([]byte, len(v))
	copy(cp, v)
	return cp, true
}

// RootHash returns the hash of the root node, or a zero hash if empty.
func (t *Tree) RootHash() [32]byte {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.ensureBuilt()
	if t.root == nil {
		return [32]byte{}
	}
	return t.root.Hash
}

// Len returns the number of keys in the tree.
func (t *Tree) Len() int {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return len(t.data)
}

// Keys returns all keys in sorted order.
func (t *Tree) Keys() []string {
	t.mu.RLock()
	defer t.mu.RUnlock()
	keys := make([]string, 0, len(t.data))
	for k := range t.data {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

// rebuild reconstructs the tree from the current data.
func (t *Tree) rebuild() {
	keys := make([]string, 0, len(t.data))
	for k := range t.data {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	leaves := make([]*Node, len(keys))
	for i, k := range keys {
		leaves[i] = makeLeaf(k, t.data[k])
	}
	t.root = buildLevel(leaves)
}

// makeLeaf creates a leaf node with the hash of key+value.
func makeLeaf(key string, value []byte) *Node {
	h := sha256.New()
	h.Write([]byte(key))
	h.Write(value)
	var hash [32]byte
	copy(hash[:], h.Sum(nil))
	return &Node{
		Hash:   hash,
		Key:    key,
		Value:  value,
		IsLeaf: true,
	}
}

// buildLevel recursively builds internal nodes from a list of children.
func buildLevel(nodes []*Node) *Node {
	if len(nodes) == 0 {
		return nil
	}
	if len(nodes) == 1 {
		return nodes[0]
	}

	mid := len(nodes) / 2
	left := buildLevel(nodes[:mid])
	right := buildLevel(nodes[mid:])
	return makeInternal(left, right)
}

// makeInternal creates an internal node by hashing its children.
func makeInternal(left, right *Node) *Node {
	h := sha256.New()
	if left != nil {
		h.Write(left.Hash[:])
	}
	if right != nil {
		h.Write(right.Hash[:])
	}
	var hash [32]byte
	copy(hash[:], h.Sum(nil))
	return &Node{
		Hash:  hash,
		Left:  left,
		Right: right,
	}
}

// Diff computes the set of keys that differ between two Merkle trees.
// It traverses both trees simultaneously, pruning subtrees with matching hashes.
// Returns keys that are in local but not remote (or different), and vice versa.
func Diff(local, remote *Tree) DiffResult {
	local.mu.Lock()
	defer local.mu.Unlock()
	remote.mu.Lock()
	defer remote.mu.Unlock()

	local.ensureBuilt()
	remote.ensureBuilt()

	var result DiffResult

	// Collect leaves from both trees
	localLeaves := collectLeaves(local.root)
	remoteLeaves := collectLeaves(remote.root)

	localMap := make(map[string][32]byte)
	for _, l := range localLeaves {
		localMap[l.Key] = l.Hash
	}
	remoteMap := make(map[string][32]byte)
	for _, l := range remoteLeaves {
		remoteMap[l.Key] = l.Hash
	}

	// Find keys only in local or with different hash
	for key, lHash := range localMap {
		rHash, exists := remoteMap[key]
		if !exists {
			result.OnlyLocal = append(result.OnlyLocal, key)
		} else if lHash != rHash {
			result.Different = append(result.Different, key)
		}
	}

	// Find keys only in remote
	for key := range remoteMap {
		if _, exists := localMap[key]; !exists {
			result.OnlyRemote = append(result.OnlyRemote, key)
		}
	}

	sort.Strings(result.OnlyLocal)
	sort.Strings(result.OnlyRemote)
	sort.Strings(result.Different)

	return result
}

// FastDiff uses tree structure to skip subtrees with matching root hashes.
// It collects only the leaves from differing subtrees and then compares them
// using a map-based approach. More efficient than Diff for large trees
// with few differences because matching subtrees are never traversed.
func FastDiff(local, remote *Tree) DiffResult {
	local.mu.Lock()
	defer local.mu.Unlock()
	remote.mu.Lock()
	defer remote.mu.Unlock()

	local.ensureBuilt()
	remote.ensureBuilt()

	// Quick check: if roots match, no differences
	if local.root != nil && remote.root != nil && local.root.Hash == remote.root.Hash {
		return DiffResult{}
	}

	// Collect only the leaves under differing subtrees
	var localDirty, remoteDirty []*Node
	collectDirtyLeaves(local.root, remote.root, &localDirty, &remoteDirty)

	// Build maps and compare
	lMap := make(map[string][32]byte)
	for _, l := range localDirty {
		lMap[l.Key] = l.Hash
	}
	rMap := make(map[string][32]byte)
	for _, r := range remoteDirty {
		rMap[r.Key] = r.Hash
	}

	var result DiffResult
	for k, lh := range lMap {
		rh, ok := rMap[k]
		if !ok {
			result.OnlyLocal = append(result.OnlyLocal, k)
		} else if lh != rh {
			result.Different = append(result.Different, k)
		}
	}
	for k := range rMap {
		if _, ok := lMap[k]; !ok {
			result.OnlyRemote = append(result.OnlyRemote, k)
		}
	}

	sort.Strings(result.OnlyLocal)
	sort.Strings(result.OnlyRemote)
	sort.Strings(result.Different)
	return result
}

// collectDirtyLeaves walks both trees in parallel, collecting leaf nodes
// only from subtrees whose hashes differ (the "dirty" parts).
func collectDirtyLeaves(local, remote *Node, lOut, rOut *[]*Node) {
	if local == nil && remote == nil {
		return
	}
	if local == nil {
		*rOut = append(*rOut, collectLeaves(remote)...)
		return
	}
	if remote == nil {
		*lOut = append(*lOut, collectLeaves(local)...)
		return
	}
	if local.Hash == remote.Hash {
		return
	}
	if local.IsLeaf && remote.IsLeaf {
		*lOut = append(*lOut, local)
		*rOut = append(*rOut, remote)
		return
	}
	if local.IsLeaf || remote.IsLeaf {
		*lOut = append(*lOut, collectLeaves(remote)...)
		*rOut = append(*rOut, collectLeaves(remote)...)
		return
	}
	collectDirtyLeaves(local.Left, remote.Left, lOut, rOut)
	collectDirtyLeaves(local.Right, remote.Right, lOut, rOut)
}

// DiffResult holds the outcome of comparing two Merkle trees.
type DiffResult struct {
	OnlyLocal  []string // keys only in local tree
	OnlyRemote []string // keys only in remote tree
	Different  []string // keys present in both but with different values
}

// HasDifferences returns true if there are any differences.
func (d DiffResult) HasDifferences() bool {
	return len(d.OnlyLocal) > 0 || len(d.OnlyRemote) > 0 || len(d.Different) > 0
}

// TotalDiffs returns the total count of differences.
func (d DiffResult) TotalDiffs() int {
	return len(d.OnlyLocal) + len(d.OnlyRemote) + len(d.Different)
}

// collectLeaves gathers all leaf nodes from a subtree.
func collectLeaves(n *Node) []*Node {
	if n == nil {
		return nil
	}
	var result []*Node
	collectLeavesInto(n, &result)
	return result
}

func collectLeavesInto(n *Node, result *[]*Node) {
	if n == nil {
		return
	}
	if n.IsLeaf {
		*result = append(*result, n)
		return
	}
	collectLeavesInto(n.Left, result)
	collectLeavesInto(n.Right, result)
}

// Proof represents a Merkle proof for a single key.
type Proof struct {
	Key      string
	Value    []byte
	Siblings [][32]byte // sibling hashes from leaf to root
	Sides    []bool     // true = sibling is on the right
}

// Verify checks if the proof is valid against the given root hash.
func (p *Proof) Verify(rootHash [32]byte) bool {
	h := sha256.New()
	h.Write([]byte(p.Key))
	h.Write(p.Value)
	var current [32]byte
	copy(current[:], h.Sum(nil))

	for i, sibling := range p.Siblings {
		h.Reset()
		if p.Sides[i] {
			h.Write(current[:])
			h.Write(sibling[:])
		} else {
			h.Write(sibling[:])
			h.Write(current[:])
		}
		copy(current[:], h.Sum(nil))
	}

	return current == rootHash
}

// SerializeRootHash converts a root hash to bytes.
func SerializeRootHash(hash [32]byte) []byte {
	return hash[:]
}

// DeserializeRootHash converts bytes back to a root hash.
func DeserializeRootHash(data []byte) ([32]byte, error) {
	if len(data) < 32 {
		return [32]byte{}, errShortData
	}
	var hash [32]byte
	copy(hash[:], data[:32])
	return hash, nil
}

// SerializeDiffResult encodes a DiffResult to bytes.
func SerializeDiffResult(d DiffResult) []byte {
	size := 4 + 4 + 4 // three length prefixes
	for _, k := range d.OnlyLocal {
		size += 2 + len(k)
	}
	for _, k := range d.OnlyRemote {
		size += 2 + len(k)
	}
	for _, k := range d.Different {
		size += 2 + len(k)
	}
	buf := make([]byte, size)
	offset := 0

	binary.BigEndian.PutUint32(buf[offset:], uint32(len(d.OnlyLocal)))
	offset += 4
	for _, k := range d.OnlyLocal {
		binary.BigEndian.PutUint16(buf[offset:], uint16(len(k)))
		offset += 2
		copy(buf[offset:], k)
		offset += len(k)
	}

	binary.BigEndian.PutUint32(buf[offset:], uint32(len(d.OnlyRemote)))
	offset += 4
	for _, k := range d.OnlyRemote {
		binary.BigEndian.PutUint16(buf[offset:], uint16(len(k)))
		offset += 2
		copy(buf[offset:], k)
		offset += len(k)
	}

	binary.BigEndian.PutUint32(buf[offset:], uint32(len(d.Different)))
	offset += 4
	for _, k := range d.Different {
		binary.BigEndian.PutUint16(buf[offset:], uint16(len(k)))
		offset += 2
		copy(buf[offset:], k)
		offset += len(k)
	}

	return buf[:offset]
}