"""Cryptographic random number generation."""
from __future__ import annotations

import os
import secrets
import string
import struct
from typing import Sequence, TypeVar

T = TypeVar("T")


def secure_random_bytes(n: int) -> bytes:
    """Generate *n* cryptographically secure random bytes."""
    if n < 0:
        raise ValueError("byte count must be non-negative")
    if n == 0:
        return b""
    return os.urandom(n)


def secure_random_int(low: int, high: int) -> int:
    """Return a random integer in [low, high] inclusive."""
    if low > high:
        raise ValueError(f"low ({low}) must be <= high ({high})")
    return secrets.randbelow(high - low + 1) + low


def generate_token(length: int = 32) -> str:
    """Generate a URL-safe random token string."""
    if length <= 0:
        raise ValueError("token length must be positive")
    return secrets.token_urlsafe(length)


def generate_hex_token(length: int = 32) -> str:
    """Generate a random hex string of *length* hex characters."""
    if length <= 0:
        raise ValueError("token length must be positive")
    byte_count = (length + 1) // 2
    return os.urandom(byte_count).hex()[:length]


def generate_id(prefix: str = "", length: int = 16) -> str:
    """Generate a random identifier with an optional prefix."""
    if length <= 0:
        raise ValueError("length must be positive")
    charset = string.ascii_lowercase + string.digits
    random_part = "".join(secrets.choice(charset) for _ in range(length))
    if prefix:
        return f"{prefix}_{random_part}"
    return random_part


def generate_salt(length: int = 32) -> bytes:
    """Generate a random salt for key derivation."""
    return secure_random_bytes(length)


def generate_iv(length: int = 16) -> bytes:
    """Generate a random initialization vector."""
    return secure_random_bytes(length)


def generate_nonce(length: int = 12) -> bytes:
    """Generate a random nonce for authenticated encryption."""
    return secure_random_bytes(length)


def secure_shuffle(items: list[T]) -> list[T]:
    """Return a new list with items in cryptographically random order."""
    result = list(items)
    n = len(result)
    for i in range(n - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        result[i], result[j] = result[j], result[i]
    return result


def secure_choice(items: Sequence[T]) -> T:
    """Pick a cryptographically random element from a non-empty sequence."""
    if not items:
        raise ValueError("cannot choose from empty sequence")
    return items[secrets.randbelow(len(items))]


def secure_sample(items: Sequence[T], k: int) -> list[T]:
    """Return *k* unique elements chosen randomly from *items*."""
    if k < 0:
        raise ValueError("sample size must be non-negative")
    if k > len(items):
        raise ValueError("sample size exceeds population")
    pool = list(items)
    result: list[T] = []
    for _ in range(k):
        idx = secrets.randbelow(len(pool))
        result.append(pool[idx])
        pool[idx] = pool[-1]
        pool.pop()
    return result


def generate_key_pair_seed(size: int = 32) -> tuple[bytes, bytes]:
    """Generate a deterministic seed pair (private_seed, public_seed).

    Not real asymmetric crypto — just paired random values for simulation.
    """
    private_seed = secure_random_bytes(size)
    public_seed = _derive_public_from_private(private_seed)
    return private_seed, public_seed


def _derive_public_from_private(private: bytes) -> bytes:
    """Derive a simulated public key from a private seed via XOR folding."""
    import hashlib
    return hashlib.sha256(private).digest()


def random_percentage() -> float:
    """Return a random float between 0.0 and 1.0."""
    raw = struct.unpack("Q", os.urandom(8))[0]
    return raw / (2**64 - 1)


def generate_uuid_v4() -> str:
    """Generate a random UUID v4 string."""
    b = bytearray(os.urandom(16))
    b[6] = (b[6] & 0x0F) | 0x40
    b[8] = (b[8] & 0x3F) | 0x80
    h = b.hex()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:]}"


def constant_time_compare(a: bytes, b: bytes) -> bool:
    """Compare two byte strings in constant time to prevent timing attacks."""
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= x ^ y
    return result == 0
