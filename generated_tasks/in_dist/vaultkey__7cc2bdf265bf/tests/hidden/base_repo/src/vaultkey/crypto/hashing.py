"""Secure hashing operations."""
from __future__ import annotations

import hashlib
import hmac
import struct
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from vaultkey.utils.errors import HashError


class HashAlgorithm(Enum):
    SHA256 = "sha256"
    SHA384 = "sha384"
    SHA512 = "sha512"
    BLAKE2B = "blake2b"
    BLAKE2S = "blake2s"


_HASH_SIZES: dict[HashAlgorithm, int] = {
    HashAlgorithm.SHA256: 32,
    HashAlgorithm.SHA384: 48,
    HashAlgorithm.SHA512: 64,
    HashAlgorithm.BLAKE2B: 64,
    HashAlgorithm.BLAKE2S: 32,
}


def hash_digest(data: bytes, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> bytes:
    """Compute a hash digest of the given data."""
    try:
        if algorithm == HashAlgorithm.BLAKE2B:
            return hashlib.blake2b(data).digest()
        if algorithm == HashAlgorithm.BLAKE2S:
            return hashlib.blake2s(data).digest()
        h = hashlib.new(algorithm.value)
        h.update(data)
        return h.digest()
    except Exception as e:
        raise HashError(f"hashing failed: {e}") from e


def hash_hex(data: bytes, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> str:
    """Compute a hex-encoded hash digest."""
    return hash_digest(data, algorithm).hex()


def hash_size(algorithm: HashAlgorithm) -> int:
    """Return the digest size in bytes for the given algorithm."""
    return _HASH_SIZES[algorithm]


def compute_hmac(key: bytes, data: bytes, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> bytes:
    """Compute HMAC of data with the given key."""
    if not key:
        raise HashError("HMAC key must not be empty")
    try:
        alg = algorithm.value
        if algorithm in (HashAlgorithm.BLAKE2B, HashAlgorithm.BLAKE2S):
            alg = "sha256"
        return hmac.new(key, data, alg).digest()
    except Exception as e:
        raise HashError(f"HMAC computation failed: {e}") from e


def verify_hmac(key: bytes, data: bytes, expected: bytes, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> bool:
    """Verify an HMAC in constant time."""
    computed = compute_hmac(key, data, algorithm)
    return hmac.compare_digest(computed, expected)


def multi_hash(data: bytes, algorithms: list[HashAlgorithm] | None = None) -> dict[str, bytes]:
    """Compute multiple hash digests at once."""
    if algorithms is None:
        algorithms = [HashAlgorithm.SHA256, HashAlgorithm.SHA512]
    return {alg.value: hash_digest(data, alg) for alg in algorithms}


@dataclass
class HashChain:
    """A chain of hashes where each entry links to the previous one."""

    algorithm: HashAlgorithm = HashAlgorithm.SHA256
    _entries: list[HashChainEntry] = field(default_factory=list)
    _last_hash: bytes = field(default=b"")
    _initial_hash: bytes = field(default=b"")

    def append(self, data: bytes) -> HashChainEntry:
        """Add data to the chain, linking it to the previous entry."""
        index = len(self._entries)
        entry_hash = self._compute_entry_hash(data, self._last_hash, index)
        entry = HashChainEntry(
            index=index,
            data=data,
            hash=entry_hash,
            previous_hash=self._last_hash,
        )
        self._entries.append(entry)
        self._last_hash = entry_hash
        return entry

    def verify(self) -> bool:
        """Verify the entire chain's integrity."""
        if not self._entries:
            return True

        prev_hash = self._initial_hash
        for entry in self._entries:
            expected = self._compute_entry_hash(entry.data, prev_hash, entry.index)
            if entry.hash != expected:
                return False
            if entry.previous_hash != prev_hash:
                return False
            prev_hash = entry.hash
        return True

    def verify_entry(self, index: int) -> bool:
        """Verify a single entry in the chain."""
        if index < 0 or index >= len(self._entries):
            return False
        entry = self._entries[index]
        prev_hash = self._entries[index - 1].hash if index > 0 else b""
        expected = self._compute_entry_hash(entry.data, prev_hash, entry.index)
        return entry.hash == expected and entry.previous_hash == prev_hash

    def get_entry(self, index: int) -> HashChainEntry | None:
        if 0 <= index < len(self._entries):
            return self._entries[index]
        return None

    @property
    def last_hash(self) -> bytes:
        return self._last_hash

    @last_hash.setter
    def last_hash(self, value: bytes) -> None:
        self._last_hash = value

    def __len__(self) -> int:
        return len(self._entries)

    def _compute_entry_hash(self, data: bytes, previous_hash: bytes, index: int) -> bytes:
        payload = previous_hash + struct.pack(">I", index) + data
        return hash_digest(payload, self.algorithm)


@dataclass(frozen=True)
class HashChainEntry:
    """A single entry in a hash chain."""
    index: int
    data: bytes
    hash: bytes
    previous_hash: bytes


class MerkleTree:
    """A Merkle tree for verifying data integrity."""

    def __init__(self, leaves: list[bytes], algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> None:
        if not leaves:
            raise HashError("merkle tree requires at least one leaf")
        self._algorithm = algorithm
        self._leaves = [hash_digest(leaf, algorithm) for leaf in leaves]
        self._original_leaves = list(leaves)
        self._tree: list[list[bytes]] = []
        self._build()

    def _build(self) -> None:
        current_level = list(self._leaves)
        self._tree = [current_level]

        while len(current_level) > 1:
            next_level: list[bytes] = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                right = current_level[i + 1] if i + 1 < len(current_level) else left
                parent = hash_digest(left + right, self._algorithm)
                next_level.append(parent)
            self._tree.append(next_level)
            current_level = next_level

    @property
    def root(self) -> bytes:
        """Return the Merkle root hash."""
        return self._tree[-1][0]

    @property
    def root_hex(self) -> str:
        return self.root.hex()

    @property
    def leaf_count(self) -> int:
        return len(self._leaves)

    @property
    def height(self) -> int:
        return len(self._tree)

    def get_proof(self, leaf_index: int) -> list[tuple[bytes, str]]:
        """Get the Merkle proof for a leaf at the given index.

        Returns list of (hash, side) tuples where side is 'left' or 'right'.
        """
        if leaf_index < 0 or leaf_index >= len(self._leaves):
            raise HashError(f"leaf index {leaf_index} out of range")

        proof: list[tuple[bytes, str]] = []
        idx = leaf_index

        for level in self._tree[:-1]:
            if idx % 2 == 0:
                sibling_idx = idx + 1
                if sibling_idx < len(level):
                    proof.append((level[sibling_idx], "right"))
                else:
                    proof.append((level[idx], "right"))
            else:
                proof.append((level[idx - 1], "left"))
            idx //= 2

        return proof

    def verify_proof(self, leaf_data: bytes, leaf_index: int, proof: list[tuple[bytes, str]]) -> bool:
        """Verify a Merkle proof for a piece of data."""
        current = hash_digest(leaf_data, self._algorithm)

        for sibling_hash, side in proof:
            if side == "left":
                current = hash_digest(sibling_hash + current, self._algorithm)
            else:
                current = hash_digest(current + sibling_hash, self._algorithm)

        return current == self.root

    def verify_tree(self) -> bool:
        """Verify the entire tree structure is consistent."""
        for level_idx in range(len(self._tree) - 1):
            level = self._tree[level_idx]
            next_level = self._tree[level_idx + 1]
            for i in range(0, len(level), 2):
                left = level[i]
                right = level[i + 1] if i + 1 < len(level) else left
                expected = hash_digest(left + right, self._algorithm)
                parent_idx = i // 2
                if parent_idx >= len(next_level) or next_level[parent_idx] != expected:
                    return False
        return True


def iterated_hash(data: bytes, iterations: int, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> bytes:
    """Apply hash function iteratively."""
    if iterations <= 0:
        raise HashError("iterations must be positive")
    current = data
    for _ in range(iterations):
        current = hash_digest(current, algorithm)
    return current


def hash_to_int(data: bytes, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> int:
    """Hash data and interpret the result as an integer."""
    digest = hash_digest(data, algorithm)
    return int.from_bytes(digest, "big")


def fingerprint(data: bytes, length: int = 8) -> str:
    """Compute a short fingerprint for display purposes."""
    digest = hash_digest(data, HashAlgorithm.SHA256)
    return digest[:length].hex()


class HMAC:
    """Hash-based message authentication code with streaming support."""

    def __init__(self, key: bytes, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> None:
        if not key:
            raise HashError("HMAC key must not be empty")
        self._key = key
        self._algorithm = algorithm
        alg = algorithm.value
        if algorithm in (HashAlgorithm.BLAKE2B, HashAlgorithm.BLAKE2S):
            alg = "sha256"
        self._hmac = hmac.new(key, digestmod=alg)

    def update(self, data: bytes) -> HMAC:
        """Feed data incrementally."""
        self._hmac.update(data)
        return self

    def digest(self) -> bytes:
        return self._hmac.digest()

    def hex_digest(self) -> str:
        return self._hmac.hexdigest()

    def verify(self, expected: bytes) -> bool:
        return hmac.compare_digest(self.digest(), expected)

    def copy(self) -> HMAC:
        new = HMAC.__new__(HMAC)
        new._key = self._key
        new._algorithm = self._algorithm
        new._hmac = self._hmac.copy()
        return new


class StreamingHash:
    """Streaming (incremental) hash computation."""

    def __init__(self, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> None:
        self._algorithm = algorithm
        self._bytes_processed = 0
        self._chunk_count = 0
        if algorithm == HashAlgorithm.BLAKE2B:
            self._hasher = hashlib.blake2b()
        elif algorithm == HashAlgorithm.BLAKE2S:
            self._hasher = hashlib.blake2s()
        else:
            self._hasher = hashlib.new(algorithm.value)

    def update(self, data: bytes) -> StreamingHash:
        """Feed more data into the hash."""
        self._hasher.update(data)
        self._bytes_processed += len(data)
        self._chunk_count += 1
        return self

    def digest(self) -> bytes:
        return self._hasher.digest()

    def hex_digest(self) -> str:
        return self._hasher.hexdigest()

    @property
    def bytes_processed(self) -> int:
        return self._bytes_processed

    @property
    def chunk_count(self) -> int:
        return self._chunk_count

    def copy(self) -> StreamingHash:
        new = StreamingHash.__new__(StreamingHash)
        new._algorithm = self._algorithm
        new._bytes_processed = self._bytes_processed
        new._chunk_count = self._chunk_count
        new._hasher = self._hasher.copy()
        return new


@dataclass(frozen=True)
class KeyCommitment:
    """Hash-based key commitment that binds a key to a context."""
    commitment: bytes
    opening: bytes
    context: bytes

    def verify(self, key: bytes, context: bytes) -> bool:
        """Verify that the commitment matches the key and context."""
        expected = hash_digest(key + context + self.opening, HashAlgorithm.SHA256)
        return hmac.compare_digest(self.commitment, expected)


class KeyCommitmentScheme:
    """Generates and verifies key commitments."""

    def __init__(self, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> None:
        self._algorithm = algorithm

    def commit(self, key: bytes, context: bytes = b"") -> KeyCommitment:
        """Create a commitment for a key."""
        import os
        opening = os.urandom(32)
        commitment = hash_digest(key + context + opening, self._algorithm)
        return KeyCommitment(commitment=commitment, opening=opening, context=context)

    def verify(self, commitment: KeyCommitment, key: bytes) -> bool:
        """Verify a key commitment."""
        expected = hash_digest(key + commitment.context + commitment.opening, self._algorithm)
        return hmac.compare_digest(commitment.commitment, expected)


def double_hash(data: bytes, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> bytes:
    """Compute H(H(data)) — double hashing for commitment schemes."""
    first = hash_digest(data, algorithm)
    return hash_digest(first, algorithm)


def salted_hash(data: bytes, salt: bytes, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> bytes:
    """Compute H(salt || data)."""
    return hash_digest(salt + data, algorithm)


def keyed_hash(key: bytes, data: bytes, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> bytes:
    """Compute a keyed hash H(key || data || key)."""
    return hash_digest(key + data + key, algorithm)


class HashTreeStorage:
    """Persistent hash tree that supports append and membership proofs."""

    def __init__(self, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> None:
        self._algorithm = algorithm
        self._leaves: list[bytes] = []
        self._data: list[bytes] = []
        self._tree: MerkleTree | None = None
        self._dirty = True

    def append(self, data: bytes) -> int:
        """Append data and return its leaf index."""
        idx = len(self._data)
        self._data.append(data)
        self._leaves.append(hash_digest(data, self._algorithm))
        self._dirty = True
        return idx

    def _rebuild(self) -> None:
        if self._dirty and self._data:
            self._tree = MerkleTree(self._data, self._algorithm)
            self._dirty = False

    @property
    def root(self) -> bytes:
        self._rebuild()
        if self._tree is None:
            return b""
        return self._tree.root

    def get_proof(self, index: int) -> list[tuple[bytes, str]]:
        """Get a Merkle proof for the leaf at the given index."""
        self._rebuild()
        if self._tree is None:
            raise HashError("empty tree")
        return self._tree.get_proof(index)

    def verify_proof(self, data: bytes, index: int, proof: list[tuple[bytes, str]]) -> bool:
        self._rebuild()
        if self._tree is None:
            return False
        return self._tree.verify_proof(data, index, proof)

    @property
    def size(self) -> int:
        return len(self._data)

    def get_data(self, index: int) -> bytes | None:
        if 0 <= index < len(self._data):
            return self._data[index]
        return None

    def verify_integrity(self) -> bool:
        self._rebuild()
        if self._tree is None:
            return True
        return self._tree.verify_tree()


def constant_time_hash_compare(a: bytes, b: bytes) -> bool:
    """Compare two hash digests in constant time."""
    return hmac.compare_digest(a, b)


def hash_combine(hashes: list[bytes], algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> bytes:
    """Combine multiple hashes into a single hash."""
    if not hashes:
        raise HashError("cannot combine empty hash list")
    combined = b"".join(hashes)
    return hash_digest(combined, algorithm)


def truncated_hash(data: bytes, length: int, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> bytes:
    """Return a truncated hash digest."""
    digest = hash_digest(data, algorithm)
    if length > len(digest):
        raise HashError(f"requested length {length} exceeds digest size {len(digest)}")
    return digest[:length]


class HashComparator:
    """Utility for comparing hashes with timing-safe operations."""

    def __init__(self, algorithm: HashAlgorithm = HashAlgorithm.SHA256) -> None:
        self._algorithm = algorithm

    def are_equal(self, a: bytes, b: bytes) -> bool:
        """Compare two raw hash values."""
        return hmac.compare_digest(a, b)

    def data_matches_hash(self, data: bytes, expected_hash: bytes) -> bool:
        """Hash data and compare to expected hash."""
        computed = hash_digest(data, self._algorithm)
        return hmac.compare_digest(computed, expected_hash)

    def data_matches_hex(self, data: bytes, expected_hex: str) -> bool:
        """Hash data and compare to expected hex string."""
        computed = hash_hex(data, self._algorithm)
        return hmac.compare_digest(computed.encode(), expected_hex.encode())

    def batch_verify(self, items: list[tuple[bytes, bytes]]) -> list[bool]:
        """Verify multiple (data, expected_hash) pairs."""
        return [self.data_matches_hash(data, expected) for data, expected in items]
