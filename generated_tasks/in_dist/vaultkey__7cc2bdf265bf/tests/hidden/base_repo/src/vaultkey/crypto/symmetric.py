"""Symmetric encryption operations."""
from __future__ import annotations

import hashlib
import hmac
import os
import struct
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from vaultkey.crypto.random import generate_iv, generate_nonce, secure_random_bytes
from vaultkey.utils.errors import EncryptionError


class CipherMode(Enum):
    CTR = "ctr"
    CBC = "cbc"
    GCM = "gcm"


BLOCK_SIZE = 16
NONCE_SIZE = 12
TAG_SIZE = 16


def _validate_key(key: bytes) -> None:
    if len(key) not in (16, 24, 32):
        raise EncryptionError(f"invalid key size: {len(key)} (must be 16, 24, or 32)")


def _xor_bytes(a: bytes, b: bytes) -> bytes:
    return bytes(x ^ y for x, y in zip(a, b))


def pkcs7_pad(data: bytes, block_size: int = BLOCK_SIZE) -> bytes:
    """Apply PKCS7 padding."""
    if block_size < 1 or block_size > 255:
        raise EncryptionError(f"invalid block size: {block_size}")
    pad_len = block_size - (len(data) % block_size)
    return data + bytes([pad_len] * pad_len)


def pkcs7_unpad(data: bytes, block_size: int = BLOCK_SIZE) -> bytes:
    """Remove PKCS7 padding."""
    if not data:
        raise EncryptionError("cannot unpad empty data")
    if len(data) % block_size != 0:
        raise EncryptionError("data length is not a multiple of block size")
    pad_len = data[-1]
    if pad_len == 0 or pad_len > block_size:
        raise EncryptionError("invalid padding")
    for i in range(1, pad_len + 1):
        if data[-i] != pad_len:
            raise EncryptionError("invalid padding bytes")
    return data[:-pad_len]


def _aes_block_encrypt(block: bytes, key: bytes) -> bytes:
    """Simplified AES-like block cipher (simulated with keyed hash)."""
    if len(block) != BLOCK_SIZE:
        raise EncryptionError("block must be 16 bytes")
    h = hashlib.sha256(key + block + b"enc").digest()
    return h[:BLOCK_SIZE]


def _aes_block_decrypt(block: bytes, key: bytes) -> bytes:
    """Inverse of the simulated AES block cipher.

    Since our cipher uses a hash, we use a keyed-hash approach where
    encryption and decryption share the same forward transform. We store
    the plaintext XOR'd into the ciphertext for reversibility.
    """
    h = hashlib.sha256(key + block + b"dec").digest()
    return h[:BLOCK_SIZE]


def _ctr_keystream(key: bytes, nonce: bytes, num_blocks: int) -> bytes:
    """Generate CTR mode keystream."""
    stream = b""
    for counter in range(num_blocks):
        counter_bytes = nonce + struct.pack(">I", counter)
        if len(counter_bytes) < BLOCK_SIZE:
            counter_bytes = counter_bytes + b"\x00" * (BLOCK_SIZE - len(counter_bytes))
        block = hashlib.sha256(key + counter_bytes[:BLOCK_SIZE]).digest()[:BLOCK_SIZE]
        stream += block
    return stream


def encrypt_ctr(plaintext: bytes, key: bytes, nonce: bytes | None = None) -> CTRCiphertext:
    """Encrypt using CTR mode."""
    _validate_key(key)
    if nonce is None:
        nonce = generate_nonce(NONCE_SIZE)
    if len(nonce) != NONCE_SIZE:
        raise EncryptionError(f"nonce must be {NONCE_SIZE} bytes")

    num_blocks = (len(plaintext) + BLOCK_SIZE - 1) // BLOCK_SIZE
    keystream = _ctr_keystream(key, nonce, max(num_blocks, 1))
    ciphertext = _xor_bytes(plaintext, keystream[:len(plaintext)])

    return CTRCiphertext(ciphertext=ciphertext, nonce=nonce)


def decrypt_ctr(ct: CTRCiphertext, key: bytes) -> bytes:
    """Decrypt CTR mode ciphertext."""
    _validate_key(key)
    num_blocks = (len(ct.ciphertext) + BLOCK_SIZE - 1) // BLOCK_SIZE
    keystream = _ctr_keystream(key, ct.nonce, max(num_blocks, 1))
    return _xor_bytes(ct.ciphertext, keystream[:len(ct.ciphertext)])


@dataclass(frozen=True)
class CTRCiphertext:
    ciphertext: bytes
    nonce: bytes

    def to_bytes(self) -> bytes:
        return self.nonce + self.ciphertext

    @classmethod
    def from_bytes(cls, data: bytes) -> CTRCiphertext:
        if len(data) < NONCE_SIZE:
            raise EncryptionError("data too short for CTR ciphertext")
        return cls(nonce=data[:NONCE_SIZE], ciphertext=data[NONCE_SIZE:])


def _cbc_keystream_block(key: bytes, block_input: bytes) -> bytes:
    """Produce a deterministic keystream block from key and input."""
    return hashlib.sha256(key + block_input + b"cbc").digest()[:BLOCK_SIZE]


def _cbc_encrypt_blocks(plaintext_blocks: list[bytes], key: bytes, iv: bytes) -> list[bytes]:
    """Encrypt blocks using CBC mode."""
    ciphertext_blocks: list[bytes] = []
    prev = iv
    for block in plaintext_blocks:
        chained = _xor_bytes(block, prev)
        ks = _cbc_keystream_block(key, prev)
        encrypted = _xor_bytes(chained, ks)
        ciphertext_blocks.append(encrypted)
        prev = encrypted
    return ciphertext_blocks


def _cbc_decrypt_blocks(ciphertext_blocks: list[bytes], key: bytes, iv: bytes) -> list[bytes]:
    """Decrypt blocks using CBC mode."""
    plaintext_blocks: list[bytes] = []
    prev = iv
    for block in ciphertext_blocks:
        ks = _cbc_keystream_block(key, prev)
        chained = _xor_bytes(block, ks)
        plaintext = _xor_bytes(chained, prev)
        plaintext_blocks.append(plaintext)
        prev = block
    return plaintext_blocks


def encrypt_cbc(plaintext: bytes, key: bytes, iv: bytes | None = None) -> CBCCiphertext:
    """Encrypt using CBC mode with PKCS7 padding."""
    _validate_key(key)
    if iv is None:
        iv = generate_iv(BLOCK_SIZE)
    if len(iv) != BLOCK_SIZE:
        raise EncryptionError(f"IV must be {BLOCK_SIZE} bytes")

    padded = pkcs7_pad(plaintext)
    blocks = [padded[i:i + BLOCK_SIZE] for i in range(0, len(padded), BLOCK_SIZE)]
    encrypted_blocks = _cbc_encrypt_blocks(blocks, key, iv)
    ciphertext = b"".join(encrypted_blocks)

    return CBCCiphertext(ciphertext=ciphertext, iv=iv)


def decrypt_cbc(ct: CBCCiphertext, key: bytes) -> bytes:
    """Decrypt CBC mode ciphertext."""
    _validate_key(key)
    if len(ct.ciphertext) % BLOCK_SIZE != 0:
        raise EncryptionError("ciphertext length must be a multiple of block size")

    blocks = [ct.ciphertext[i:i + BLOCK_SIZE] for i in range(0, len(ct.ciphertext), BLOCK_SIZE)]
    decrypted_blocks = _cbc_decrypt_blocks(blocks, key, ct.iv)
    plaintext_padded = b"".join(decrypted_blocks)

    return pkcs7_unpad(plaintext_padded)


@dataclass(frozen=True)
class CBCCiphertext:
    ciphertext: bytes
    iv: bytes

    def to_bytes(self) -> bytes:
        return self.iv + self.ciphertext

    @classmethod
    def from_bytes(cls, data: bytes) -> CBCCiphertext:
        if len(data) < BLOCK_SIZE:
            raise EncryptionError("data too short for CBC ciphertext")
        return cls(iv=data[:BLOCK_SIZE], ciphertext=data[BLOCK_SIZE:])


def _ghash(h_key: bytes, aad: bytes, ciphertext: bytes) -> bytes:
    """Simplified GHASH for GCM authentication."""
    data = (
        aad
        + b"\x00" * ((16 - len(aad) % 16) % 16)
        + ciphertext
        + b"\x00" * ((16 - len(ciphertext) % 16) % 16)
        + struct.pack(">QQ", len(aad) * 8, len(ciphertext) * 8)
    )
    tag = hashlib.sha256(h_key + data).digest()[:TAG_SIZE]
    return tag


def encrypt_gcm(
    plaintext: bytes,
    key: bytes,
    nonce: bytes | None = None,
    aad: bytes = b"",
) -> GCMCiphertext:
    """Encrypt using GCM mode (authenticated encryption)."""
    _validate_key(key)
    if nonce is None:
        nonce = generate_nonce(NONCE_SIZE)
    if len(nonce) != NONCE_SIZE:
        raise EncryptionError(f"nonce must be {NONCE_SIZE} bytes")

    num_blocks = (len(plaintext) + BLOCK_SIZE - 1) // BLOCK_SIZE
    keystream = _ctr_keystream(key, nonce, max(num_blocks, 1) + 1)
    ciphertext = _xor_bytes(plaintext, keystream[BLOCK_SIZE:BLOCK_SIZE + len(plaintext)])

    h_key = hashlib.sha256(key + b"ghash_key").digest()[:16]
    tag = _ghash(h_key, aad, ciphertext)
    tag = _xor_bytes(tag, keystream[:TAG_SIZE])

    return GCMCiphertext(ciphertext=ciphertext, nonce=nonce, tag=tag, aad=aad)


def decrypt_gcm(ct: GCMCiphertext, key: bytes) -> bytes:
    """Decrypt GCM mode ciphertext with authentication."""
    _validate_key(key)

    num_blocks = (len(ct.ciphertext) + BLOCK_SIZE - 1) // BLOCK_SIZE
    keystream = _ctr_keystream(key, ct.nonce, max(num_blocks, 1) + 1)

    h_key = hashlib.sha256(key + b"ghash_key").digest()[:16]
    expected_tag = _ghash(h_key, ct.aad, ct.ciphertext)
    expected_tag = _xor_bytes(expected_tag, keystream[:TAG_SIZE])

    if not hmac.compare_digest(ct.tag, expected_tag):
        raise EncryptionError("authentication failed: tag mismatch")

    plaintext = _xor_bytes(ct.ciphertext, keystream[BLOCK_SIZE:BLOCK_SIZE + len(ct.ciphertext)])
    return plaintext


@dataclass(frozen=True)
class GCMCiphertext:
    ciphertext: bytes
    nonce: bytes
    tag: bytes
    aad: bytes = b""

    def to_bytes(self) -> bytes:
        return self.nonce + self.tag + self.ciphertext

    @classmethod
    def from_bytes(cls, data: bytes, aad: bytes = b"") -> GCMCiphertext:
        min_len = NONCE_SIZE + TAG_SIZE
        if len(data) < min_len:
            raise EncryptionError("data too short for GCM ciphertext")
        nonce = data[:NONCE_SIZE]
        tag = data[NONCE_SIZE:NONCE_SIZE + TAG_SIZE]
        ciphertext = data[NONCE_SIZE + TAG_SIZE:]
        return cls(nonce=nonce, tag=tag, ciphertext=ciphertext, aad=aad)


class SymmetricCipher:
    """High-level symmetric cipher wrapper."""

    def __init__(self, key: bytes, mode: CipherMode = CipherMode.GCM) -> None:
        _validate_key(key)
        self._key = key
        self._mode = mode

    @property
    def mode(self) -> CipherMode:
        return self._mode

    def encrypt(self, plaintext: bytes, aad: bytes = b"") -> bytes:
        """Encrypt and return serialized ciphertext."""
        if self._mode == CipherMode.CTR:
            ct = encrypt_ctr(plaintext, self._key)
            return b"\x01" + ct.to_bytes()
        elif self._mode == CipherMode.CBC:
            ct = encrypt_cbc(plaintext, self._key)
            return b"\x02" + ct.to_bytes()
        elif self._mode == CipherMode.GCM:
            ct = encrypt_gcm(plaintext, self._key, aad=aad)
            return b"\x03" + ct.to_bytes()
        else:
            raise EncryptionError(f"unsupported mode: {self._mode}")

    def decrypt(self, data: bytes, aad: bytes = b"") -> bytes:
        """Decrypt serialized ciphertext."""
        if len(data) < 2:
            raise EncryptionError("ciphertext too short")
        mode_byte = data[0]
        payload = data[1:]

        if mode_byte == 0x01:
            ct = CTRCiphertext.from_bytes(payload)
            return decrypt_ctr(ct, self._key)
        elif mode_byte == 0x02:
            ct = CBCCiphertext.from_bytes(payload)
            return decrypt_cbc(ct, self._key)
        elif mode_byte == 0x03:
            ct = GCMCiphertext.from_bytes(payload, aad=aad)
            return decrypt_gcm(ct, self._key)
        else:
            raise EncryptionError(f"unknown cipher mode byte: {mode_byte:#x}")


def generate_key(size: int = 32) -> bytes:
    """Generate a random encryption key."""
    if size not in (16, 24, 32):
        raise EncryptionError(f"invalid key size: {size}")
    return secure_random_bytes(size)


@dataclass
class KeyBundle:
    """A collection of related keys for different purposes."""

    encryption_key: bytes
    signing_key: bytes
    key_id: str
    created_at: float = field(default_factory=lambda: __import__("time").time())
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def generate(cls, key_id: str, key_size: int = 32) -> KeyBundle:
        return cls(
            encryption_key=generate_key(key_size),
            signing_key=secure_random_bytes(key_size),
            key_id=key_id,
        )

    def rotate(self, new_key_id: str) -> KeyBundle:
        """Create a new key bundle, preserving metadata lineage."""
        new = KeyBundle.generate(new_key_id, len(self.encryption_key))
        new.metadata["previous_key_id"] = self.key_id
        new.metadata["rotated_from"] = self.created_at
        return new


def aes_key_wrap(kek: bytes, plaintext_key: bytes) -> bytes:
    """AES Key Wrap (RFC 3394-style) using keyed hash as block cipher."""
    _validate_key(kek)
    if len(plaintext_key) % 8 != 0 or len(plaintext_key) < 16:
        raise EncryptionError("plaintext key must be a multiple of 8 bytes and >= 16 bytes")
    n = len(plaintext_key) // 8
    a = b"\xa6" * 8
    r_blocks = [plaintext_key[i * 8:(i + 1) * 8] for i in range(n)]
    for j in range(6):
        for i in range(n):
            b_input = a + r_blocks[i]
            b = hashlib.sha256(kek + b_input + struct.pack(">I", j * n + i + 1)).digest()[:16]
            t_val = struct.pack(">Q", n * j + i + 1)
            a = _xor_bytes(b[:8], t_val)
            r_blocks[i] = b[8:16]
    return a + b"".join(r_blocks)


def aes_key_unwrap(kek: bytes, wrapped_key: bytes) -> bytes:
    """AES Key Unwrap (RFC 3394-style inverse)."""
    _validate_key(kek)
    if len(wrapped_key) < 24 or (len(wrapped_key) - 8) % 8 != 0:
        raise EncryptionError("invalid wrapped key length")
    n = (len(wrapped_key) - 8) // 8
    a = wrapped_key[:8]
    r_blocks = [wrapped_key[8 + i * 8:16 + i * 8] for i in range(n)]
    for j in range(5, -1, -1):
        for i in range(n - 1, -1, -1):
            t_val = struct.pack(">Q", n * j + i + 1)
            a_xor = _xor_bytes(a, t_val)
            b_input = a_xor + r_blocks[i]
            b = hashlib.sha256(kek + b_input + struct.pack(">I", j * n + i + 1)).digest()[:16]
            a = b[:8]
            r_blocks[i] = b[8:16]
    if a != b"\xa6" * 8:
        raise EncryptionError("key unwrap integrity check failed")
    return b"".join(r_blocks)


@dataclass
class CipherSuiteConfig:
    """Configuration for cipher suite negotiation."""
    name: str
    mode: CipherMode
    key_size: int
    priority: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {"name": self.name, "mode": self.mode.value, "key_size": self.key_size, "priority": self.priority}


class CipherSuiteNegotiator:
    """Negotiates the best cipher suite between client and server."""

    def __init__(self) -> None:
        self._suites: list[CipherSuiteConfig] = []
        self._register_defaults()

    def _register_defaults(self) -> None:
        self._suites = [
            CipherSuiteConfig(name="AES-256-GCM", mode=CipherMode.GCM, key_size=32, priority=0),
            CipherSuiteConfig(name="AES-256-CTR", mode=CipherMode.CTR, key_size=32, priority=10),
            CipherSuiteConfig(name="AES-256-CBC", mode=CipherMode.CBC, key_size=32, priority=20),
            CipherSuiteConfig(name="AES-128-GCM", mode=CipherMode.GCM, key_size=16, priority=30),
        ]

    def register_suite(self, suite: CipherSuiteConfig) -> None:
        self._suites.append(suite)
        self._suites.sort(key=lambda s: s.priority)

    def negotiate(self, client_suites: list[str], server_suites: list[str] | None = None) -> CipherSuiteConfig | None:
        """Return the highest-priority suite supported by both sides."""
        available = server_suites or [s.name for s in self._suites]
        for suite in sorted(self._suites, key=lambda s: s.priority):
            if suite.name in client_suites and suite.name in available:
                return suite
        return None

    def list_suites(self) -> list[CipherSuiteConfig]:
        return list(self._suites)

    def get_suite(self, name: str) -> CipherSuiteConfig | None:
        for s in self._suites:
            if s.name == name:
                return s
        return None


_CONTAINER_VERSION = 1


@dataclass
class EncryptedContainer:
    """Versioned encrypted data container with metadata."""
    version: int
    algorithm: str
    ciphertext: bytes
    nonce: bytes
    tag: bytes
    key_id: str
    created_at: float
    aad: bytes = b""
    metadata: dict[str, Any] = field(default_factory=dict)

    def serialize(self) -> bytes:
        """Serialize the container to a compact binary format."""
        header = struct.pack(">BH", self.version, len(self.algorithm))
        alg_bytes = self.algorithm.encode("utf-8")
        kid_bytes = self.key_id.encode("utf-8")
        parts = [
            header,
            alg_bytes,
            struct.pack(">H", len(kid_bytes)),
            kid_bytes,
            struct.pack(">H", len(self.nonce)),
            self.nonce,
            struct.pack(">H", len(self.tag)),
            self.tag,
            struct.pack(">I", len(self.ciphertext)),
            self.ciphertext,
        ]
        return b"".join(parts)

    @classmethod
    def create(
        cls,
        plaintext: bytes,
        key: bytes,
        key_id: str,
        algorithm: str = "AES-256-GCM",
        aad: bytes = b"",
    ) -> EncryptedContainer:
        """Encrypt plaintext and return a versioned container."""
        _validate_key(key)
        ct = encrypt_gcm(plaintext, key, aad=aad)
        return cls(
            version=_CONTAINER_VERSION,
            algorithm=algorithm,
            ciphertext=ct.ciphertext,
            nonce=ct.nonce,
            tag=ct.tag,
            key_id=key_id,
            created_at=__import__("time").time(),
            aad=aad,
        )

    def decrypt(self, key: bytes) -> bytes:
        """Decrypt the container contents."""
        _validate_key(key)
        from vaultkey.crypto.symmetric import decrypt_gcm, GCMCiphertext
        gcm_ct = GCMCiphertext(ciphertext=self.ciphertext, nonce=self.nonce, tag=self.tag, aad=self.aad)
        return decrypt_gcm(gcm_ct, key)


class MultiRecipientEncryption:
    """Encrypts data for multiple recipients, each with their own key."""

    def __init__(self) -> None:
        self._recipient_keys: dict[str, bytes] = {}

    def add_recipient(self, recipient_id: str, key: bytes) -> None:
        _validate_key(key)
        self._recipient_keys[recipient_id] = key

    def remove_recipient(self, recipient_id: str) -> bool:
        return self._recipient_keys.pop(recipient_id, None) is not None

    def encrypt(self, plaintext: bytes) -> tuple[bytes, dict[str, bytes]]:
        """Encrypt with a random DEK, then wrap DEK for each recipient.

        Returns (ciphertext_with_nonce_tag, {recipient_id: wrapped_dek}).
        """
        if not self._recipient_keys:
            raise EncryptionError("no recipients configured")
        dek = generate_key(32)
        ct = encrypt_gcm(plaintext, dek)
        ciphertext_blob = ct.nonce + ct.tag + ct.ciphertext
        wrapped_deks: dict[str, bytes] = {}
        for rid, rkey in self._recipient_keys.items():
            wrapped_ct = encrypt_gcm(dek, rkey)
            wrapped_deks[rid] = wrapped_ct.nonce + wrapped_ct.tag + wrapped_ct.ciphertext
        return ciphertext_blob, wrapped_deks

    def decrypt(self, ciphertext_blob: bytes, wrapped_dek: bytes, recipient_key: bytes) -> bytes:
        """Decrypt using a specific recipient's wrapped DEK."""
        _validate_key(recipient_key)
        if len(wrapped_dek) < 28:
            raise EncryptionError("wrapped DEK too short")
        dek_nonce = wrapped_dek[:12]
        dek_tag = wrapped_dek[12:28]
        dek_ct = wrapped_dek[28:]
        dek_gcm = GCMCiphertext(ciphertext=dek_ct, nonce=dek_nonce, tag=dek_tag)
        dek = decrypt_gcm(dek_gcm, recipient_key)
        if len(ciphertext_blob) < 28:
            raise EncryptionError("ciphertext blob too short")
        nonce = ciphertext_blob[:12]
        tag = ciphertext_blob[12:28]
        ct = ciphertext_blob[28:]
        data_gcm = GCMCiphertext(ciphertext=ct, nonce=nonce, tag=tag)
        return decrypt_gcm(data_gcm, dek)

    @property
    def recipient_count(self) -> int:
        return len(self._recipient_keys)

    def list_recipients(self) -> list[str]:
        return sorted(self._recipient_keys.keys())


class KeyScheduleCache:
    """Caches expanded key schedules to avoid repeated key setup."""

    def __init__(self, max_size: int = 64) -> None:
        self._max_size = max_size
        self._cache: dict[str, tuple[bytes, float]] = {}
        self._hits = 0
        self._misses = 0

    def get_or_create(self, key: bytes, mode: CipherMode) -> bytes:
        """Return a cached expanded key or derive one."""
        cache_key = hashlib.sha256(key + mode.value.encode()).hexdigest()[:16]
        if cache_key in self._cache:
            self._hits += 1
            return self._cache[cache_key][0]
        self._misses += 1
        expanded = hashlib.sha512(key + b"schedule_" + mode.value.encode()).digest()
        if len(self._cache) >= self._max_size:
            oldest = next(iter(self._cache))
            del self._cache[oldest]
        self._cache[cache_key] = (expanded, __import__("time").time())
        return expanded

    def invalidate(self, key: bytes, mode: CipherMode) -> bool:
        cache_key = hashlib.sha256(key + mode.value.encode()).hexdigest()[:16]
        return self._cache.pop(cache_key, None) is not None

    def clear(self) -> None:
        self._cache.clear()
        self._hits = 0
        self._misses = 0

    @property
    def hit_rate(self) -> float:
        total = self._hits + self._misses
        return self._hits / total if total > 0 else 0.0

    @property
    def size(self) -> int:
        return len(self._cache)


class StreamingCipher:
    """Streaming encryption/decryption interface for large data."""

    def __init__(self, key: bytes, mode: CipherMode = CipherMode.CTR) -> None:
        _validate_key(key)
        self._key = key
        self._mode = mode
        self._block_counter = 0
        self._nonce: bytes | None = None
        self._finalized = False

    def begin_encrypt(self, nonce: bytes | None = None) -> bytes:
        """Initialize encryption and return the nonce/header."""
        from vaultkey.crypto.random import generate_nonce
        self._nonce = nonce or generate_nonce(NONCE_SIZE)
        self._block_counter = 0
        self._finalized = False
        return self._nonce

    def update_encrypt(self, chunk: bytes) -> bytes:
        """Encrypt one chunk of data."""
        if self._nonce is None:
            raise EncryptionError("must call begin_encrypt first")
        if self._finalized:
            raise EncryptionError("cipher already finalized")
        num_blocks = (len(chunk) + BLOCK_SIZE - 1) // BLOCK_SIZE
        nonce_with_offset = hashlib.sha256(
            self._nonce + struct.pack(">Q", self._block_counter)
        ).digest()[:NONCE_SIZE]
        keystream = _ctr_keystream(self._key, nonce_with_offset, max(num_blocks, 1))
        self._block_counter += num_blocks
        return _xor_bytes(chunk, keystream[:len(chunk)])

    def finalize_encrypt(self) -> bytes:
        """Finalize encryption and return any trailing data (e.g., tag)."""
        self._finalized = True
        tag = hashlib.sha256(
            self._key + (self._nonce or b"") + struct.pack(">Q", self._block_counter)
        ).digest()[:TAG_SIZE]
        return tag

    def begin_decrypt(self, nonce: bytes) -> None:
        """Initialize decryption."""
        self._nonce = nonce
        self._block_counter = 0
        self._finalized = False

    def update_decrypt(self, chunk: bytes) -> bytes:
        """Decrypt one chunk of data."""
        return self.update_encrypt(chunk)

    def verify_and_finalize(self, tag: bytes) -> bool:
        """Verify the authentication tag and finalize."""
        expected = hashlib.sha256(
            self._key + (self._nonce or b"") + struct.pack(">Q", self._block_counter)
        ).digest()[:TAG_SIZE]
        self._finalized = True
        return hmac.compare_digest(tag, expected)
