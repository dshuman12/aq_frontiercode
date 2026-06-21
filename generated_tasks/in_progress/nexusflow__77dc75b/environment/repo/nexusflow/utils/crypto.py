"""
nexusflow.utils.crypto
~~~~~~~~~~~~~~~~~~~~~~

Encryption, hashing, and key management utilities. Provides
secure defaults for common cryptographic operations.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import struct
import time
from typing import Any, Dict, Optional, Tuple, Union


class HashAlgorithm:
    """Wraps hashlib algorithms with a consistent interface."""

    def __init__(self, algorithm: str = "sha256") -> None:
        self._algorithm = algorithm

    def hash(self, data: Union[str, bytes]) -> str:
        """Hash data and return hex digest."""
        if isinstance(data, str):
            data = data.encode("utf-8")
        h = hashlib.new(self._algorithm)
        h.update(data)
        return h.hexdigest()

    def hash_bytes(self, data: Union[str, bytes]) -> bytes:
        """Hash data and return raw bytes."""
        if isinstance(data, str):
            data = data.encode("utf-8")
        h = hashlib.new(self._algorithm)
        h.update(data)
        return h.digest()

    def hash_file(self, filepath: str, chunk_size: int = 8192) -> str:
        """Hash a file's contents."""
        h = hashlib.new(self._algorithm)
        with open(filepath, "rb") as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                h.update(chunk)
        return h.hexdigest()


class HMAC:
    """HMAC-based message authentication."""

    def __init__(self, key: Union[str, bytes], algorithm: str = "sha256") -> None:
        self._key = key.encode("utf-8") if isinstance(key, str) else key
        self._algorithm = algorithm

    def sign(self, message: Union[str, bytes]) -> str:
        """Create an HMAC signature."""
        if isinstance(message, str):
            message = message.encode("utf-8")
        return hmac.new(self._key, message, self._algorithm).hexdigest()

    def verify(self, message: Union[str, bytes], signature: str) -> bool:
        """Verify an HMAC signature (constant-time comparison)."""
        expected = self.sign(message)
        return hmac.compare_digest(expected, signature)


class PasswordHasher:
    """Secure password hashing using PBKDF2."""

    def __init__(
        self,
        iterations: int = 100_000,
        algorithm: str = "sha256",
        salt_length: int = 32,
        key_length: int = 32,
    ) -> None:
        self._iterations = iterations
        self._algorithm = algorithm
        self._salt_length = salt_length
        self._key_length = key_length

    def hash(self, password: str) -> str:
        """Hash a password with a random salt."""
        salt = os.urandom(self._salt_length)
        key = hashlib.pbkdf2_hmac(
            self._algorithm,
            password.encode("utf-8"),
            salt,
            self._iterations,
            dklen=self._key_length,
        )
        salt_b64 = base64.b64encode(salt).decode("ascii")
        key_b64 = base64.b64encode(key).decode("ascii")
        return f"$pbkdf2${self._algorithm}${self._iterations}${salt_b64}${key_b64}"

    def verify(self, password: str, hashed: str) -> bool:
        """Verify a password against a stored hash."""
        try:
            parts = hashed.split("$")
            if len(parts) != 6 or parts[1] != "pbkdf2":
                return False
            algorithm = parts[2]
            iterations = int(parts[3])
            salt = base64.b64decode(parts[4])
            stored_key = base64.b64decode(parts[5])

            computed_key = hashlib.pbkdf2_hmac(
                algorithm,
                password.encode("utf-8"),
                salt,
                iterations,
                dklen=len(stored_key),
            )
            return hmac.compare_digest(stored_key, computed_key)
        except Exception:
            return False


class XORCipher:
    """Simple XOR cipher for non-security-critical obfuscation."""

    def __init__(self, key: Union[str, bytes]) -> None:
        self._key = key.encode("utf-8") if isinstance(key, str) else key

    def encrypt(self, data: Union[str, bytes]) -> bytes:
        """XOR encrypt data."""
        if isinstance(data, str):
            data = data.encode("utf-8")
        key_len = len(self._key)
        return bytes(b ^ self._key[i % key_len] for i, b in enumerate(data))

    def decrypt(self, data: bytes) -> bytes:
        """XOR decrypt data (same as encrypt for XOR)."""
        return self.encrypt(data)


class TokenGenerator:
    """Generates secure tokens for various purposes."""

    @staticmethod
    def generate_token(length: int = 32) -> str:
        """Generate a random URL-safe token."""
        return secrets.token_urlsafe(length)

    @staticmethod
    def generate_hex(length: int = 32) -> str:
        """Generate a random hex string."""
        return secrets.token_hex(length)

    @staticmethod
    def generate_api_key(prefix: str = "nf") -> str:
        """Generate an API key with prefix."""
        token = secrets.token_urlsafe(24)
        return f"{prefix}_{token}"

    @staticmethod
    def generate_timed_token(secret: str, data: str, ttl: int = 3600) -> str:
        """Generate a time-limited token."""
        expires = int(time.time()) + ttl
        payload = f"{data}:{expires}"
        sig = hmac.new(
            secret.encode("utf-8"),
            payload.encode("utf-8"),
            "sha256",
        ).hexdigest()[:16]
        token = base64.urlsafe_b64encode(
            f"{payload}:{sig}".encode("utf-8")
        ).decode("ascii")
        return token

    @staticmethod
    def verify_timed_token(secret: str, token: str) -> Optional[str]:
        """Verify and extract data from a timed token."""
        try:
            decoded = base64.urlsafe_b64decode(token.encode("ascii")).decode("utf-8")
            parts = decoded.rsplit(":", 2)
            if len(parts) != 3:
                return None
            data, expires_str, sig = parts
            expires = int(expires_str)

            if time.time() > expires:
                return None

            expected_sig = hmac.new(
                secret.encode("utf-8"),
                f"{data}:{expires_str}".encode("utf-8"),
                "sha256",
            ).hexdigest()[:16]

            if not hmac.compare_digest(sig, expected_sig):
                return None

            return data
        except Exception:
            return None


class KeyDerivation:
    """Key derivation utilities."""

    @staticmethod
    def derive_key(
        password: str,
        salt: Optional[bytes] = None,
        iterations: int = 100_000,
        key_length: int = 32,
    ) -> Tuple[bytes, bytes]:
        """Derive an encryption key from a password. Returns (key, salt)."""
        if salt is None:
            salt = os.urandom(16)
        key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            iterations,
            dklen=key_length,
        )
        return key, salt

    @staticmethod
    def constant_time_compare(a: Union[str, bytes], b: Union[str, bytes]) -> bool:
        """Compare two values in constant time."""
        if isinstance(a, str):
            a = a.encode("utf-8")
        if isinstance(b, str):
            b = b.encode("utf-8")
        return hmac.compare_digest(a, b)
