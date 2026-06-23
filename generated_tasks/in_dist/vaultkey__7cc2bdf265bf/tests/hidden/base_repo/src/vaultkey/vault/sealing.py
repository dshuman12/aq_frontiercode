"""Vault seal/unseal using Shamir's Secret Sharing."""
from __future__ import annotations

import hashlib
import os
import secrets
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from vaultkey.crypto.random import secure_random_bytes, generate_id
from vaultkey.utils.errors import SealedError, UnsealError, VaultError

PRIME = 2**127 - 1


class SealState(Enum):
    SEALED = "sealed"
    UNSEALED = "unsealed"
    UNINITIALIZED = "uninitialized"


@dataclass(frozen=True)
class SealShare:
    """A single share of the seal key."""
    index: int
    value: int
    share_id: str

    def to_hex(self) -> str:
        return f"{self.index}:{self.value:032x}"

    @classmethod
    def from_hex(cls, hex_str: str) -> SealShare:
        parts = hex_str.split(":")
        if len(parts) != 2:
            raise UnsealError("invalid share format")
        idx = int(parts[0])
        val = int(parts[1], 16)
        return cls(index=idx, value=val, share_id=generate_id("sh"))


@dataclass
class SealStatus:
    """Current seal status of the vault."""
    state: SealState = SealState.UNINITIALIZED
    threshold: int = 0
    total_shares: int = 0
    progress: int = 0
    sealed_at: float | None = None
    unsealed_at: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "state": self.state.value,
            "threshold": self.threshold,
            "total_shares": self.total_shares,
            "progress": self.progress,
            "sealed_at": self.sealed_at,
            "unsealed_at": self.unsealed_at,
        }


def _mod_inverse(a: int, m: int) -> int:
    """Compute modular multiplicative inverse using extended Euclidean algorithm."""
    if a < 0:
        a = a % m
    g, x, _ = _extended_gcd(a, m)
    if g != 1:
        raise UnsealError("modular inverse does not exist")
    return x % m


def _extended_gcd(a: int, b: int) -> tuple[int, int, int]:
    if a == 0:
        return b, 0, 1
    g, x, y = _extended_gcd(b % a, a)
    return g, y - (b // a) * x, x


def _evaluate_polynomial(coefficients: list[int], x: int, prime: int) -> int:
    """Evaluate a polynomial at point x in the finite field."""
    result = 0
    for i in range(len(coefficients) - 1, -1, -1):
        result = (result * x + coefficients[i]) % prime
    return result


def generate_shares(secret: int, threshold: int, num_shares: int, prime: int = PRIME) -> list[SealShare]:
    """Generate Shamir's Secret Sharing shares.

    Uses x-coordinates starting at 1 (not 0) to avoid the trivial evaluation
    where polynomial(0) = secret.
    """
    if threshold < 2:
        raise UnsealError("threshold must be >= 2")
    if num_shares < threshold:
        raise UnsealError("num_shares must be >= threshold")
    if secret >= prime:
        raise UnsealError("secret must be less than the prime")

    coefficients = [secret]
    for _ in range(threshold - 1):
        coefficients.append(secrets.randbelow(prime))

    shares: list[SealShare] = []
    for i in range(1, num_shares + 1):
        y = _evaluate_polynomial(coefficients, i, prime)
        shares.append(SealShare(
            index=i,
            value=y,
            share_id=generate_id("sh"),
        ))

    return shares


def reconstruct_secret(shares: list[SealShare], prime: int = PRIME) -> int:
    """Reconstruct the secret from shares using Lagrange interpolation."""
    if len(shares) < 2:
        raise UnsealError("need at least 2 shares")

    xs = [s.index for s in shares]
    ys = [s.value for s in shares]

    if len(set(xs)) != len(xs):
        raise UnsealError("duplicate share indices")

    secret = 0
    k = len(shares)

    for i in range(k):
        numerator = 1
        denominator = 1
        for j in range(k):
            if i == j:
                continue
            numerator = (numerator * (0 - xs[j])) % prime
            denominator = (denominator * (xs[i] - xs[j])) % prime

        lagrange = (ys[i] * numerator * _mod_inverse(denominator, prime)) % prime
        secret = (secret + lagrange) % prime

    return secret


class SealManager:
    """Manages vault seal/unseal operations."""

    def __init__(self, shares: int = 5, threshold: int = 3) -> None:
        if threshold < 2:
            raise UnsealError("threshold must be >= 2")
        if shares < threshold:
            raise UnsealError("shares must be >= threshold")

        self._total_shares = shares
        self._threshold = threshold
        self._status = SealStatus(
            state=SealState.UNINITIALIZED,
            threshold=threshold,
            total_shares=shares,
        )
        self._root_key: bytes | None = None
        self._root_key_int: int | None = None
        self._pending_shares: list[SealShare] = []
        self._seal_time: float | None = None
        self._unseal_time: float | None = None

    @property
    def status(self) -> SealStatus:
        return self._status

    @property
    def is_sealed(self) -> bool:
        return self._status.state in (SealState.SEALED, SealState.UNINITIALIZED)

    @property
    def is_initialized(self) -> bool:
        return self._status.state != SealState.UNINITIALIZED

    @property
    def root_key(self) -> bytes | None:
        if self.is_sealed:
            return None
        return self._root_key

    @property
    def seal_time(self) -> float | None:
        return self._seal_time

    @property
    def unseal_time(self) -> float | None:
        return self._unseal_time

    def initialize(self) -> list[str]:
        """Initialize the vault and generate seal shares."""
        if self._status.state != SealState.UNINITIALIZED:
            raise UnsealError("vault already initialized")

        root_key_bytes = secure_random_bytes(16)
        self._root_key_int = int.from_bytes(root_key_bytes, "big") % PRIME
        self._root_key = hashlib.sha256(root_key_bytes).digest()

        shares = generate_shares(
            self._root_key_int,
            self._threshold,
            self._total_shares,
        )

        self._status.state = SealState.SEALED
        self._status.progress = 0
        self._seal_time = time.time()
        self._status.sealed_at = self._seal_time
        self._root_key = None

        return [s.to_hex() for s in shares]

    def unseal(self, share_hex: str) -> SealStatus:
        """Submit a share to progress toward unsealing."""
        if self._status.state == SealState.UNINITIALIZED:
            raise UnsealError("vault is not initialized")
        if self._status.state == SealState.UNSEALED:
            raise UnsealError("vault is already unsealed")

        share = SealShare.from_hex(share_hex)

        for existing in self._pending_shares:
            if existing.index == share.index:
                raise UnsealError(f"duplicate share index: {share.index}")

        self._pending_shares.append(share)
        self._status.progress = len(self._pending_shares)

        if len(self._pending_shares) >= self._threshold:
            self._complete_unseal()

        return self._status

    def _complete_unseal(self) -> None:
        try:
            reconstructed = reconstruct_secret(self._pending_shares)
            root_key_bytes = reconstructed.to_bytes(
                (reconstructed.bit_length() + 7) // 8 or 1, "big"
            ).rjust(16, b"\x00")[-16:]
            self._root_key = hashlib.sha256(root_key_bytes).digest()
            self._root_key_int = reconstructed

            self._status.state = SealState.UNSEALED
            self._unseal_time = time.time()
            self._status.unsealed_at = self._unseal_time
            self._status.sealed_at = None
            self._pending_shares.clear()
        except Exception as e:
            self._pending_shares.clear()
            self._status.progress = 0
            raise UnsealError(f"failed to reconstruct root key: {e}") from e

    def seal(self) -> SealStatus:
        """Seal the vault."""
        if self._status.state == SealState.UNINITIALIZED:
            raise UnsealError("vault is not initialized")

        self._root_key = None
        self._pending_shares.clear()
        self._status.state = SealState.SEALED
        self._status.progress = 0
        self._seal_time = time.time()
        self._status.sealed_at = self._seal_time
        self._status.unsealed_at = None
        return self._status

    def reset_unseal_progress(self) -> None:
        self._pending_shares.clear()
        self._status.progress = 0

    def require_unsealed(self) -> None:
        """Raise SealedError if the vault is sealed."""
        if self.is_sealed:
            raise SealedError()


@dataclass(frozen=True)
class RecoveryKey:
    """A recovery key generated for emergency unseal."""
    key_id: str
    key_material: bytes
    created_at: float
    nonce: bytes

    def to_hex(self) -> str:
        return f"{self.key_id}:{self.key_material.hex()}"


class RecoveryKeyGenerator:
    """Generates recovery keys for disaster recovery scenarios."""

    def __init__(self, key_size: int = 32) -> None:
        self._key_size = key_size
        self._generated_keys: list[RecoveryKey] = []

    def generate(self, count: int = 1) -> list[RecoveryKey]:
        """Generate one or more recovery keys."""
        keys: list[RecoveryKey] = []
        for _ in range(count):
            rk = RecoveryKey(
                key_id=generate_id("rk"),
                key_material=secure_random_bytes(self._key_size),
                created_at=time.time(),
                nonce=secure_random_bytes(12),
            )
            keys.append(rk)
            self._generated_keys.append(rk)
        return keys

    def verify_key(self, key_hex: str) -> bool:
        """Verify a recovery key exists in the generated set."""
        for rk in self._generated_keys:
            if rk.to_hex() == key_hex:
                return True
        return False

    @property
    def generated_count(self) -> int:
        return len(self._generated_keys)

    def list_key_ids(self) -> list[str]:
        return [rk.key_id for rk in self._generated_keys]


@dataclass
class SealMigrationRecord:
    """Record of a seal migration event."""
    migration_id: str
    old_threshold: int
    new_threshold: int
    old_total_shares: int
    new_total_shares: int
    migrated_at: float = field(default_factory=time.time)
    success: bool = True


class SealMigration:
    """Manages migration of seal parameters."""

    def __init__(self, seal_manager: SealManager) -> None:
        self._manager = seal_manager
        self._migrations: list[SealMigrationRecord] = []

    def migrate(
        self,
        new_threshold: int,
        new_total_shares: int,
        current_shares: list[str],
    ) -> tuple[list[str], SealMigrationRecord]:
        """Re-key the seal with new parameters.

        Requires enough shares to unseal first.
        """
        if new_threshold < 2:
            raise UnsealError("new threshold must be >= 2")
        if new_total_shares < new_threshold:
            raise UnsealError("new total shares must be >= new threshold")

        old_threshold = self._manager._threshold
        old_total = self._manager._total_shares

        if self._manager.is_sealed and self._manager.is_initialized:
            for share_hex in current_shares:
                status = self._manager.unseal(share_hex)
                if not self._manager.is_sealed:
                    break
            if self._manager.is_sealed:
                raise UnsealError("insufficient shares to unseal for migration")

        root_key_int = self._manager._root_key_int
        if root_key_int is None:
            raise UnsealError("no root key available for migration")

        new_shares = generate_shares(root_key_int, new_threshold, new_total_shares)

        self._manager._threshold = new_threshold
        self._manager._total_shares = new_total_shares
        self._manager._status.threshold = new_threshold
        self._manager._status.total_shares = new_total_shares

        self._manager.seal()

        record = SealMigrationRecord(
            migration_id=generate_id("mig"),
            old_threshold=old_threshold,
            new_threshold=new_threshold,
            old_total_shares=old_total,
            new_total_shares=new_total_shares,
        )
        self._migrations.append(record)
        return [s.to_hex() for s in new_shares], record

    @property
    def migration_count(self) -> int:
        return len(self._migrations)

    def get_migrations(self) -> list[SealMigrationRecord]:
        return list(self._migrations)


class AutoUnsealProvider:
    """Interface for automatic unseal mechanisms."""

    def __init__(self, name: str) -> None:
        self._name = name
        self._enabled = False
        self._last_unseal: float | None = None
        self._unseal_count = 0

    @property
    def name(self) -> str:
        return self._name

    @property
    def enabled(self) -> bool:
        return self._enabled

    def enable(self) -> None:
        self._enabled = True

    def disable(self) -> None:
        self._enabled = False

    def get_shares(self) -> list[str]:
        """Override in subclasses to provide shares from external sources."""
        raise NotImplementedError("subclasses must implement get_shares")

    def auto_unseal(self, manager: SealManager) -> SealStatus:
        """Attempt automatic unseal using provided shares."""
        if not self._enabled:
            raise UnsealError("auto-unseal provider is disabled")
        shares = self.get_shares()
        for share in shares:
            status = manager.unseal(share)
            if not manager.is_sealed:
                self._last_unseal = time.time()
                self._unseal_count += 1
                return status
        raise UnsealError("auto-unseal failed: insufficient shares")

    @property
    def unseal_count(self) -> int:
        return self._unseal_count

    @property
    def last_unseal_time(self) -> float | None:
        return self._last_unseal


@dataclass
class SealAuditEvent:
    """Audit event for seal/unseal operations."""
    event_id: str
    operation: str
    timestamp: float = field(default_factory=time.time)
    success: bool = True
    shares_provided: int = 0
    error: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


class SealAuditLog:
    """Tracks seal/unseal audit events."""

    def __init__(self, max_entries: int = 1000) -> None:
        self._events: list[SealAuditEvent] = []
        self._max_entries = max_entries

    def log_seal(self, success: bool = True, error: str = "") -> SealAuditEvent:
        evt = SealAuditEvent(
            event_id=generate_id("sevt"),
            operation="seal",
            success=success,
            error=error,
        )
        self._add(evt)
        return evt

    def log_unseal(self, shares_provided: int, success: bool = True, error: str = "") -> SealAuditEvent:
        evt = SealAuditEvent(
            event_id=generate_id("sevt"),
            operation="unseal",
            success=success,
            shares_provided=shares_provided,
            error=error,
        )
        self._add(evt)
        return evt

    def log_init(self) -> SealAuditEvent:
        evt = SealAuditEvent(event_id=generate_id("sevt"), operation="initialize")
        self._add(evt)
        return evt

    def _add(self, event: SealAuditEvent) -> None:
        if len(self._events) >= self._max_entries:
            self._events.pop(0)
        self._events.append(event)

    def get_events(self, operation: str | None = None, since: float = 0) -> list[SealAuditEvent]:
        results = self._events
        if operation:
            results = [e for e in results if e.operation == operation]
        if since:
            results = [e for e in results if e.timestamp >= since]
        return results

    @property
    def total_events(self) -> int:
        return len(self._events)

    def failure_count(self) -> int:
        return sum(1 for e in self._events if not e.success)


@dataclass
class SealConfiguration:
    """Persistent seal configuration."""
    threshold: int = 3
    total_shares: int = 5
    auto_unseal_enabled: bool = False
    auto_unseal_provider: str = ""
    recovery_keys_enabled: bool = False
    max_recovery_keys: int = 3
    seal_audit_enabled: bool = True

    def validate(self) -> list[str]:
        """Validate the configuration and return warnings."""
        warnings: list[str] = []
        if self.threshold < 2:
            warnings.append("threshold must be >= 2")
        if self.total_shares < self.threshold:
            warnings.append("total_shares must be >= threshold")
        if self.threshold == 1:
            warnings.append("threshold of 1 is insecure")
        if self.total_shares > 20:
            warnings.append("more than 20 shares may be impractical")
        return warnings

    def to_dict(self) -> dict[str, Any]:
        return {
            "threshold": self.threshold,
            "total_shares": self.total_shares,
            "auto_unseal_enabled": self.auto_unseal_enabled,
            "auto_unseal_provider": self.auto_unseal_provider,
            "recovery_keys_enabled": self.recovery_keys_enabled,
            "seal_audit_enabled": self.seal_audit_enabled,
        }
