package merkle

import "crypto/sha256"

// GenerateProof creates a Merkle proof for the given key in the tree.
// Returns nil if the key doesn't exist.
func (t *Tree) GenerateProof(key string) *Proof {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.ensureBuilt()

	if t.root == nil { return nil }
	if _, ok := t.data[key]; !ok { return nil }

	value := make([]byte, len(t.data[key]))
	copy(value, t.data[key])

	siblings, sides := collectProofPath(t.root, key)
	if siblings == nil { return nil }

	return &Proof{Key: key, Value: value, Siblings: siblings, Sides: sides}
}

// collectProofPath traverses the tree to find the path from root to the leaf
// containing the given key, collecting sibling hashes along the way.
func collectProofPath(node *Node, key string) ([][32]byte, []bool) {
	if node == nil { return nil, nil }
	if node.IsLeaf {
		if node.Key == key { return [][32]byte{}, []bool{} }
		return nil, nil
	}

	// Try left subtree
	if leftSiblings, leftSides := collectProofPath(node.Left, key); leftSiblings != nil {
		if node.Right != nil {
			leftSiblings = append(leftSiblings, node.Right.Hash)
			leftSides = append(leftSides, true)
		}
		return leftSiblings, leftSides
	}

	// Try right subtree
	if rightSiblings, rightSides := collectProofPath(node.Right, key); rightSiblings != nil {
		if node.Left != nil {
			rightSiblings = append(rightSiblings, node.Left.Hash)
			rightSides = append(rightSides, false)
		}
		return rightSiblings, rightSides
	}

	return nil, nil
}

// VerifyProof is a standalone function that verifies a proof against a root hash
// without needing access to the original tree.
func VerifyProof(proof *Proof, rootHash [32]byte) bool {
	if proof == nil { return false }
	return proof.Verify(rootHash)
}

// BatchVerify verifies multiple proofs against the same root hash.
// Returns the indices of invalid proofs.
func BatchVerify(proofs []*Proof, rootHash [32]byte) []int {
	var invalid []int
	for i, p := range proofs {
		if !VerifyProof(p, rootHash) { invalid = append(invalid, i) }
	}
	return invalid
}

// ProofSize returns the byte size of a proof (for network cost estimation).
func ProofSize(p *Proof) int {
	if p == nil { return 0 }
	size := len(p.Key) + len(p.Value)
	size += len(p.Siblings) * 32
	size += len(p.Sides)
	return size
}

// HashLeaf computes the leaf hash for a key-value pair (matches makeLeaf).
func HashLeaf(key string, value []byte) [32]byte {
	h := sha256.New()
	h.Write([]byte(key))
	h.Write(value)
	var hash [32]byte
	copy(hash[:], h.Sum(nil))
	return hash
}
