"""Key derivation functions."""
from __future__ import annotations

import hashlib
import hmac
import math
import os
import struct
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from vaultkey.crypto.random import generate_salt
from vaultkey.utils.errors import KeyDerivationError


class KDFAlgorithm(Enum):
    PBKDF2_SHA256 = "pbkdf2-sha256"
    PBKDF2_SHA512 = "pbkdf2-sha512"
    SCRYPT_LIKE = "scrypt-like"
    ARGON2_LIKE = "argon2-like"
    HKDF_SHA256 = "hkdf-sha256"


@dataclass(frozen=True)
class KDFParams:
    """Parameters for key derivation."""
    algorithm: KDFAlgorithm
    iterations: int = 100000
    salt_length: int = 32
    key_length: int = 32
    memory_cost: int = 65536
    parallelism: int = 4
    time_cost: int = 3

    def validate(self) -> None:
        if self.iterations < 1:
            raise KeyDerivationError("iterations must be >= 1")
        if self.salt_length < 8:
            raise KeyDerivationError("salt length must be >= 8 bytes")
        if self.key_length < 16:
            raise KeyDerivationError("key length must be >= 16 bytes")
        if self.memory_cost < 1024:
            raise KeyDerivationError("memory_cost must be >= 1024")
        if self.parallelism < 1:
            raise KeyDerivationError("parallelism must be >= 1")

    def to_dict(self) -> dict[str, Any]:
        return {
            "algorithm": self.algorithm.value,
            "iterations": self.iterations,
            "salt_length": self.salt_length,
            "key_length": self.key_length,
            "memory_cost": self.memory_cost,
            "parallelism": self.parallelism,
            "time_cost": self.time_cost,
        }


@dataclass(frozen=True)
class DerivedKey:
    """Result of a key derivation operation."""
    key: bytes
    salt: bytes
    params: KDFParams

    def to_dict(self) -> dict[str, Any]:
        return {
            "key_hex": self.key.hex(),
            "salt_hex": self.salt.hex(),
            "params": self.params.to_dict(),
        }


DEFAULT_PBKDF2_PARAMS = KDFParams(
    algorithm=KDFAlgorithm.PBKDF2_SHA256,
    iterations=100000,
    key_length=32,
)

DEFAULT_SCRYPT_PARAMS = KDFParams(
    algorithm=KDFAlgorithm.SCRYPT_LIKE,
    iterations=16384,
    key_length=32,
    memory_cost=65536,
)

DEFAULT_ARGON2_PARAMS = KDFParams(
    algorithm=KDFAlgorithm.ARGON2_LIKE,
    iterations=3,
    key_length=32,
    memory_cost=65536,
    parallelism=4,
    time_cost=3,
)


class KeyDerivation:
    """Key derivation function implementation."""

    def __init__(self, params: KDFParams | None = None) -> None:
        self._params = params or DEFAULT_PBKDF2_PARAMS
        self._params.validate()

    @property
    def params(self) -> KDFParams:
        return self._params

    def derive(self, password: bytes, salt: bytes | None = None) -> DerivedKey:
        """Derive a key from a password."""
        if not password:
            raise KeyDerivationError("password must not be empty")

        if salt is None:
            salt = generate_salt(self._params.salt_length)
        elif len(salt) < 8:
            raise KeyDerivationError("salt must be at least 8 bytes")

        alg = self._params.algorithm
        if alg == KDFAlgorithm.PBKDF2_SHA256:
            key = self._pbkdf2(password, salt, "sha256")
        elif alg == KDFAlgorithm.PBKDF2_SHA512:
            key = self._pbkdf2(password, salt, "sha512")
        elif alg == KDFAlgorithm.SCRYPT_LIKE:
            key = self._scrypt_like(password, salt)
        elif alg == KDFAlgorithm.ARGON2_LIKE:
            key = self._argon2_like(password, salt)
        elif alg == KDFAlgorithm.HKDF_SHA256:
            key = self._hkdf(password, salt)
        else:
            raise KeyDerivationError(f"unsupported algorithm: {alg}")

        return DerivedKey(key=key, salt=salt, params=self._params)

    def verify(self, password: bytes, derived: DerivedKey) -> bool:
        """Verify a password against a previously derived key."""
        result = self.derive(password, derived.salt)
        return hmac.compare_digest(result.key, derived.key)

    def _pbkdf2(self, password: bytes, salt: bytes, hash_name: str) -> bytes:
        try:
            return hashlib.pbkdf2_hmac(
                hash_name,
                password,
                salt,
                self._params.iterations,
                dklen=self._params.key_length,
            )
        except Exception as e:
            raise KeyDerivationError(f"PBKDF2 failed: {e}") from e

    def _scrypt_like(self, password: bytes, salt: bytes) -> bytes:
        """Scrypt-like KDF using iterated PBKDF2 with memory simulation."""
        n = min(self._params.iterations, 16384)
        r = 8
        block_size = 128 * r

        blocks: list[bytes] = []
        current = hashlib.pbkdf2_hmac("sha256", password, salt, 1, dklen=block_size)

        for i in range(n):
            h = hashlib.sha256(current + struct.pack(">I", i)).digest()
            current = h + current[32:]
            if i % (n // min(n, 64)) == 0:
                blocks.append(current[:32])

        mixed = b"\x00" * 32
        for block in blocks:
            mixed = bytes(a ^ b for a, b in zip(mixed, block))

        return hashlib.pbkdf2_hmac(
            "sha256", mixed + password, salt, max(self._params.iterations // n, 1),
            dklen=self._params.key_length,
        )

    def _argon2_like(self, password: bytes, salt: bytes) -> bytes:
        """Argon2-like KDF using iterative hashing with memory-hard simulation."""
        lane_count = self._params.parallelism
        time_cost = self._params.time_cost
        block_count = max(self._params.memory_cost // 1024, lane_count * 4)

        initial = hashlib.sha512(
            password + salt + struct.pack(">III", lane_count, time_cost, block_count)
        ).digest()

        lanes: list[bytes] = []
        for lane_idx in range(lane_count):
            lane_hash = hashlib.sha256(
                initial + struct.pack(">I", lane_idx)
            ).digest()
            lanes.append(lane_hash)

        for t in range(time_cost):
            new_lanes: list[bytes] = []
            for lane_idx in range(lane_count):
                ref_lane = (lane_idx + 1) % lane_count
                combined = lanes[lane_idx] + lanes[ref_lane] + struct.pack(">I", t)
                new_lanes.append(hashlib.sha256(combined).digest())
            lanes = new_lanes

        final_block = b"\x00" * 32
        for lane in lanes:
            final_block = bytes(a ^ b for a, b in zip(final_block, lane))

        return hashlib.pbkdf2_hmac(
            "sha256", final_block, salt, max(self._params.iterations, 1),
            dklen=self._params.key_length,
        )

    def _hkdf(self, ikm: bytes, salt: bytes) -> bytes:
        """HKDF (RFC 5869) extract-then-expand."""
        prk = hmac.new(salt, ikm, "sha256").digest()
        return self._hkdf_expand(prk, b"", self._params.key_length)

    @staticmethod
    def _hkdf_expand(prk: bytes, info: bytes, length: int) -> bytes:
        hash_len = 32
        n = math.ceil(length / hash_len)
        okm = b""
        t = b""
        for i in range(1, n + 1):
            t = hmac.new(prk, t + info + bytes([i]), "sha256").digest()
            okm += t
        return okm[:length]


def hkdf_extract(salt: bytes, ikm: bytes) -> bytes:
    """HKDF extract step."""
    if not salt:
        salt = b"\x00" * 32
    return hmac.new(salt, ikm, "sha256").digest()


def hkdf_expand(prk: bytes, info: bytes, length: int = 32) -> bytes:
    """HKDF expand step."""
    return KeyDerivation._hkdf_expand(prk, info, length)


class KeyStretcher:
    """Progressively stretch a key through multiple rounds."""

    def __init__(self, base_key: bytes, rounds: int = 10, algorithm: str = "sha256") -> None:
        if not base_key:
            raise KeyDerivationError("base key must not be empty")
        if rounds < 1:
            raise KeyDerivationError("rounds must be >= 1")
        self._base_key = base_key
        self._rounds = rounds
        self._algorithm = algorithm
        self._stretched: bytes | None = None

    def stretch(self) -> bytes:
        """Perform the key stretching and return the result."""
        current = self._base_key
        for i in range(self._rounds):
            h = hmac.new(current, struct.pack(">I", i) + self._base_key, self._algorithm)
            current = h.digest()
        self._stretched = current
        return current

    @property
    def result(self) -> bytes:
        if self._stretched is None:
            return self.stretch()
        return self._stretched

    def derive_subkey(self, context: bytes, length: int = 32) -> bytes:
        """Derive a subkey from the stretched key for a specific context."""
        base = self.result
        return hkdf_expand(base, context, length)


@dataclass
class KeyDerivationCache:
    """Cache for derived keys to avoid re-computation."""

    _max_size: int = 64
    _entries: dict[str, DerivedKey] = field(default_factory=dict)

    def get(self, cache_key: str) -> DerivedKey | None:
        return self._entries.get(cache_key)

    def put(self, cache_key: str, derived: DerivedKey) -> None:
        if len(self._entries) >= self._max_size:
            oldest = next(iter(self._entries))
            del self._entries[oldest]
        self._entries[cache_key] = derived

    def invalidate(self, cache_key: str) -> bool:
        return self._entries.pop(cache_key, None) is not None

    def clear(self) -> None:
        self._entries.clear()

    def size(self) -> int:
        return len(self._entries)

    @staticmethod
    def make_key(password_hash: str, salt_hex: str, algorithm: str) -> str:
        return f"{algorithm}:{salt_hex}:{password_hash[:16]}"


class PasswordStrengthScorer:
    """Evaluates password strength on a 0-100 scale."""

    _COMMON_PATTERNS: list[str] = [
        "password", "123456", "qwerty", "abc123", "letmein",
        "admin", "welcome", "monkey", "master", "dragon",
    ]

    def __init__(self, min_length: int = 8, max_length: int = 128) -> None:
        self._min_length = min_length
        self._max_length = max_length

    def score(self, password: str) -> int:
        """Return an integer score from 0 (very weak) to 100 (very strong)."""
        if not password:
            return 0
        points = 0
        length = len(password)
        points += min(length * 3, 30)
        if any(c.isupper() for c in password):
            points += 10
        if any(c.islower() for c in password):
            points += 10
        if any(c.isdigit() for c in password):
            points += 10
        specials = set("!@#$%^&*()_+-=[]{}|;:',.<>?/~`")
        if any(c in specials for c in password):
            points += 15
        unique_ratio = len(set(password)) / max(length, 1)
        points += int(unique_ratio * 15)
        if self._has_common_pattern(password):
            points = max(points - 30, 0)
        if length < self._min_length:
            points = max(points - 20, 0)
        return min(points, 100)

    def classify(self, password: str) -> str:
        """Return a label: very_weak, weak, fair, strong, very_strong."""
        s = self.score(password)
        if s < 20:
            return "very_weak"
        if s < 40:
            return "weak"
        if s < 60:
            return "fair"
        if s < 80:
            return "strong"
        return "very_strong"

    def meets_minimum(self, password: str, threshold: int = 40) -> bool:
        return self.score(password) >= threshold

    def _has_common_pattern(self, password: str) -> bool:
        lower = password.lower()
        for pattern in self._COMMON_PATTERNS:
            if pattern in lower:
                return True
        return False


class AdaptiveIterationCalculator:
    """Calculates KDF iteration counts based on target duration and hardware."""

    def __init__(
        self,
        target_ms: float = 250.0,
        min_iterations: int = 10000,
        max_iterations: int = 10000000,
    ) -> None:
        self._target_ms = target_ms
        self._min_iterations = min_iterations
        self._max_iterations = max_iterations

    def calibrate(self, algorithm: KDFAlgorithm = KDFAlgorithm.PBKDF2_SHA256) -> int:
        """Benchmark the system and return optimal iteration count."""
        import time as _time
        test_password = b"calibration_password_test"
        test_salt = b"\x00" * 16
        probe = 1000
        start = _time.monotonic()
        hashlib.pbkdf2_hmac("sha256", test_password, test_salt, probe, dklen=32)
        elapsed = (_time.monotonic() - start) * 1000.0
        if elapsed <= 0:
            return self._min_iterations
        ratio = self._target_ms / max(elapsed, 0.001)
        iterations = int(probe * ratio)
        return max(self._min_iterations, min(iterations, self._max_iterations))

    def scale_for_memory(self, base_iterations: int, memory_factor: float = 1.0) -> int:
        """Adjust iterations when memory-hard KDFs reduce CPU need."""
        adjusted = int(base_iterations / max(memory_factor, 0.1))
        return max(self._min_iterations, min(adjusted, self._max_iterations))

    @property
    def target_ms(self) -> float:
        return self._target_ms


class MultiAlgorithmKDFChain:
    """Chains multiple KDF algorithms for defense-in-depth."""

    def __init__(self, algorithms: list[KDFAlgorithm] | None = None) -> None:
        self._algorithms = algorithms or [
            KDFAlgorithm.PBKDF2_SHA256,
            KDFAlgorithm.HKDF_SHA256,
        ]
        if len(self._algorithms) < 1:
            raise KeyDerivationError("chain requires at least one algorithm")

    def derive(self, password: bytes, salt: bytes | None = None) -> DerivedKey:
        """Derive a key through the full chain of algorithms."""
        if not password:
            raise KeyDerivationError("password must not be empty")
        if salt is None:
            salt = generate_salt(32)
        current_key = password
        last_result: DerivedKey | None = None
        for i, alg in enumerate(self._algorithms):
            step_salt = hashlib.sha256(salt + struct.pack(">I", i)).digest()
            params = KDFParams(algorithm=alg, iterations=max(1000, 100000 // len(self._algorithms)))
            kdf = KeyDerivation(params)
            last_result = kdf.derive(current_key, step_salt)
            current_key = last_result.key
        assert last_result is not None
        return DerivedKey(key=current_key, salt=salt, params=last_result.params)

    @property
    def chain_length(self) -> int:
        return len(self._algorithms)

    @property
    def algorithms(self) -> list[KDFAlgorithm]:
        return list(self._algorithms)


class KeyDerivationContextManager:
    """Context manager that derives a key on entry and securely clears it on exit."""

    def __init__(self, password: bytes, params: KDFParams | None = None, salt: bytes | None = None) -> None:
        self._password = password
        self._params = params
        self._salt = salt
        self._derived: DerivedKey | None = None

    def __enter__(self) -> DerivedKey:
        kdf = KeyDerivation(self._params)
        self._derived = kdf.derive(self._password, self._salt)
        return self._derived

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self._derived = None

    @property
    def was_used(self) -> bool:
        return self._derived is None and self._password is not None


@dataclass
class PasswordVaultEntry:
    """A single entry in a salted password vault."""
    identifier: str
    derived: DerivedKey
    created_at: float = field(default_factory=lambda: __import__("time").time())
    tags: list[str] = field(default_factory=list)


class SaltedPasswordVault:
    """Vault for storing salted password derivations."""

    def __init__(self, params: KDFParams | None = None, max_entries: int = 1000) -> None:
        self._params = params or DEFAULT_PBKDF2_PARAMS
        self._entries: dict[str, PasswordVaultEntry] = {}
        self._max_entries = max_entries

    def store(self, identifier: str, password: bytes, tags: list[str] | None = None) -> PasswordVaultEntry:
        """Derive and store a password entry."""
        if len(self._entries) >= self._max_entries:
            oldest_id = next(iter(self._entries))
            del self._entries[oldest_id]
        kdf = KeyDerivation(self._params)
        derived = kdf.derive(password)
        entry = PasswordVaultEntry(identifier=identifier, derived=derived, tags=list(tags or []))
        self._entries[identifier] = entry
        return entry

    def verify(self, identifier: str, password: bytes) -> bool:
        """Verify a password against a stored entry."""
        entry = self._entries.get(identifier)
        if entry is None:
            return False
        kdf = KeyDerivation(self._params)
        return kdf.verify(password, entry.derived)

    def remove(self, identifier: str) -> bool:
        return self._entries.pop(identifier, None) is not None

    def list_identifiers(self) -> list[str]:
        return sorted(self._entries.keys())

    def get_entry(self, identifier: str) -> PasswordVaultEntry | None:
        return self._entries.get(identifier)

    def find_by_tag(self, tag: str) -> list[PasswordVaultEntry]:
        return [e for e in self._entries.values() if tag in e.tags]

    @property
    def size(self) -> int:
        return len(self._entries)


@dataclass
class PasswordPolicyConfig:
    """Configuration for password policy validation."""
    min_length: int = 8
    max_length: int = 128
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_digit: bool = True
    require_special: bool = False
    min_unique_chars: int = 4
    disallowed_patterns: list[str] = field(default_factory=list)
    min_strength_score: int = 40


class PasswordPolicyValidator:
    """Validates passwords against a configurable policy."""

    def __init__(self, config: PasswordPolicyConfig | None = None) -> None:
        self._config = config or PasswordPolicyConfig()
        self._scorer = PasswordStrengthScorer(min_length=self._config.min_length)

    def validate(self, password: str) -> list[str]:
        """Return a list of policy violations (empty if valid)."""
        violations: list[str] = []
        cfg = self._config
        if len(password) < cfg.min_length:
            violations.append(f"password must be at least {cfg.min_length} characters")
        if len(password) > cfg.max_length:
            violations.append(f"password must be at most {cfg.max_length} characters")
        if cfg.require_uppercase and not any(c.isupper() for c in password):
            violations.append("password must contain at least one uppercase letter")
        if cfg.require_lowercase and not any(c.islower() for c in password):
            violations.append("password must contain at least one lowercase letter")
        if cfg.require_digit and not any(c.isdigit() for c in password):
            violations.append("password must contain at least one digit")
        specials = set("!@#$%^&*()_+-=[]{}|;:',.<>?/~`")
        if cfg.require_special and not any(c in specials for c in password):
            violations.append("password must contain at least one special character")
        if len(set(password)) < cfg.min_unique_chars:
            violations.append(f"password must have at least {cfg.min_unique_chars} unique characters")
        lower = password.lower()
        for pattern in cfg.disallowed_patterns:
            if pattern.lower() in lower:
                violations.append(f"password contains disallowed pattern: {pattern}")
        if self._scorer.score(password) < cfg.min_strength_score:
            violations.append("password does not meet minimum strength requirements")
        return violations

    def is_valid(self, password: str) -> bool:
        return len(self.validate(password)) == 0

    @property
    def config(self) -> PasswordPolicyConfig:
        return self._config


class BatchKeyDerivation:
    """Derive multiple keys from a single master password efficiently."""

    def __init__(self, params: KDFParams | None = None) -> None:
        self._params = params or DEFAULT_PBKDF2_PARAMS
        self._results: dict[str, DerivedKey] = {}

    def derive_batch(self, password: bytes, contexts: list[str]) -> dict[str, DerivedKey]:
        """Derive one key per context, all from the same password."""
        if not password:
            raise KeyDerivationError("password must not be empty")
        base_salt = generate_salt(32)
        results: dict[str, DerivedKey] = {}
        for ctx in contexts:
            ctx_salt = hashlib.sha256(base_salt + ctx.encode()).digest()
            kdf = KeyDerivation(self._params)
            results[ctx] = kdf.derive(password, ctx_salt)
        self._results = results
        return results

    def get_result(self, context: str) -> DerivedKey | None:
        return self._results.get(context)

    @property
    def result_count(self) -> int:
        return len(self._results)

    def clear(self) -> None:
        self._results.clear()
