"""Transit encryption engine — encrypt/decrypt without revealing keys."""
from __future__ import annotations

import hashlib
import hmac
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from vaultkey.crypto.envelope import KeyHierarchy, MasterKey, VersionedKeyRing
from vaultkey.crypto.hashing import hash_digest, HashAlgorithm, compute_hmac
from vaultkey.crypto.random import generate_id, secure_random_bytes
from vaultkey.crypto.symmetric import (
    CipherMode,
    SymmetricCipher,
    encrypt_gcm,
    decrypt_gcm,
    generate_key,
    GCMCiphertext,
)
from vaultkey.utils.errors import CryptoError, EncryptionError, VaultError


class TransitKeyType(Enum):
    AES256_GCM = "aes256-gcm"
    AES128_GCM = "aes128-gcm"
    HMAC_SHA256 = "hmac-sha256"
    HMAC_SHA512 = "hmac-sha512"


@dataclass
class TransitKey:
    """A named encryption key managed by the transit engine."""
    name: str
    key_type: TransitKeyType
    key_ring: VersionedKeyRing
    min_decryption_version: int = 1
    min_encryption_version: int = 0
    allow_plaintext_backup: bool = False
    exportable: bool = False
    created_at: float = field(default_factory=time.time)
    deletion_allowed: bool = False

    @property
    def latest_version(self) -> int:
        return self.key_ring.current_version

    def can_decrypt_version(self, version: int) -> bool:
        return version >= self.min_decryption_version

    def can_encrypt_version(self, version: int) -> bool:
        if self.min_encryption_version == 0:
            return version == self.key_ring.current_version
        return version >= self.min_encryption_version

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "key_type": self.key_type.value,
            "latest_version": self.latest_version,
            "min_decryption_version": self.min_decryption_version,
            "min_encryption_version": self.min_encryption_version,
            "exportable": self.exportable,
            "deletion_allowed": self.deletion_allowed,
        }


@dataclass(frozen=True)
class TransitCiphertext:
    """Ciphertext produced by the transit engine."""
    key_name: str
    key_version: int
    ciphertext: bytes
    nonce: bytes
    tag: bytes
    context: bytes = b""

    def serialize(self) -> str:
        parts = [
            f"vault:v{self.key_version}",
            self.nonce.hex(),
            self.tag.hex(),
            self.ciphertext.hex(),
        ]
        return ":".join(parts)

    @classmethod
    def deserialize(cls, key_name: str, data: str) -> TransitCiphertext:
        parts = data.split(":")
        if len(parts) != 5 or parts[0] != "vault":
            raise EncryptionError("invalid transit ciphertext format")
        version = int(parts[1].lstrip("v"))
        nonce = bytes.fromhex(parts[2])
        tag = bytes.fromhex(parts[3])
        ciphertext = bytes.fromhex(parts[4])
        return cls(
            key_name=key_name,
            key_version=version,
            ciphertext=ciphertext,
            nonce=nonce,
            tag=tag,
        )


@dataclass(frozen=True)
class TransitSignature:
    """Signature produced by the transit engine."""
    key_name: str
    key_version: int
    signature: bytes
    algorithm: str

    def serialize(self) -> str:
        return f"vault:v{self.key_version}:{self.signature.hex()}"

    @classmethod
    def deserialize(cls, key_name: str, data: str, algorithm: str = "hmac-sha256") -> TransitSignature:
        parts = data.split(":")
        if len(parts) != 3 or not parts[0] == "vault":
            raise EncryptionError("invalid transit signature format")
        version = int(parts[1].lstrip("v"))
        signature = bytes.fromhex(parts[2])
        return cls(
            key_name=key_name,
            key_version=version,
            signature=signature,
            algorithm=algorithm,
        )


class TransitEngine:
    """Transit secrets engine — encrypt/decrypt data without storing it."""

    def __init__(self) -> None:
        self._keys: dict[str, TransitKey] = {}
        self._key_cache: dict[str, bytes] = {}

    def create_key(
        self,
        name: str,
        key_type: TransitKeyType = TransitKeyType.AES256_GCM,
        exportable: bool = False,
    ) -> TransitKey:
        """Create a new named encryption key."""
        if name in self._keys:
            raise VaultError(f"transit key already exists: {name}")

        key_size = 32 if "256" in key_type.value else 16
        if "hmac" in key_type.value:
            key_size = 32

        ring = VersionedKeyRing(name)
        key_material = generate_key(key_size) if key_size in (16, 32) else secure_random_bytes(key_size)
        ring.add_version(key_material)

        tk = TransitKey(
            name=name,
            key_type=key_type,
            key_ring=ring,
            exportable=exportable,
        )
        self._keys[name] = tk
        self._update_cache(name, ring.current_version, key_material)
        return tk

    def get_key(self, name: str) -> TransitKey | None:
        return self._keys.get(name)

    def delete_key(self, name: str) -> bool:
        tk = self._keys.get(name)
        if tk is None:
            return False
        if not tk.deletion_allowed:
            raise VaultError(f"deletion not allowed for key: {name}")
        del self._keys[name]
        self._clear_cache(name)
        return True

    def rotate_key(self, name: str) -> int:
        """Rotate a transit key, creating a new version."""
        tk = self._keys.get(name)
        if tk is None:
            raise VaultError(f"transit key not found: {name}")

        key_size = 32 if "256" in tk.key_type.value else 16
        if "hmac" in tk.key_type.value:
            key_size = 32

        key_material = generate_key(key_size) if key_size in (16, 32) else secure_random_bytes(key_size)
        kv = tk.key_ring.add_version(key_material)
        self._update_cache(name, kv.version, key_material)
        return kv.version

    def encrypt(self, key_name: str, plaintext: bytes, context: bytes = b"") -> TransitCiphertext:
        """Encrypt data using a named key."""
        tk = self._keys.get(key_name)
        if tk is None:
            raise VaultError(f"transit key not found: {key_name}")

        if "hmac" in tk.key_type.value:
            raise EncryptionError("HMAC keys cannot be used for encryption")

        version = tk.key_ring.current_version
        key_material = self._get_key_material(key_name, version)

        if context:
            key_material = self._derive_context_key(key_material, context)

        ct = encrypt_gcm(plaintext, key_material)

        return TransitCiphertext(
            key_name=key_name,
            key_version=version,
            ciphertext=ct.ciphertext,
            nonce=ct.nonce,
            tag=ct.tag,
            context=context,
        )

    def decrypt(self, key_name: str, transit_ct: TransitCiphertext, context: bytes = b"") -> bytes:
        """Decrypt data using a named key."""
        tk = self._keys.get(key_name)
        if tk is None:
            raise VaultError(f"transit key not found: {key_name}")

        if not tk.can_decrypt_version(transit_ct.key_version):
            raise EncryptionError(
                f"key version {transit_ct.key_version} is below minimum "
                f"decryption version {tk.min_decryption_version}"
            )

        key_material = self._get_key_material(key_name, transit_ct.key_version)

        if context:
            key_material = self._derive_context_key(key_material, context)

        gcm_ct = GCMCiphertext(
            ciphertext=transit_ct.ciphertext,
            nonce=transit_ct.nonce,
            tag=transit_ct.tag,
        )
        return decrypt_gcm(gcm_ct, key_material)

    def rewrap(self, key_name: str, transit_ct: TransitCiphertext, context: bytes = b"") -> TransitCiphertext:
        """Re-encrypt data under the latest key version without revealing plaintext."""
        plaintext = self.decrypt(key_name, transit_ct, context=context)
        return self.encrypt(key_name, plaintext, context=context)

    def sign(self, key_name: str, data: bytes) -> TransitSignature:
        """Sign data using an HMAC key."""
        tk = self._keys.get(key_name)
        if tk is None:
            raise VaultError(f"transit key not found: {key_name}")

        version = tk.key_ring.current_version
        key_material = self._get_key_material(key_name, version)

        if tk.key_type == TransitKeyType.HMAC_SHA512:
            sig = hmac.new(key_material, data, "sha512").digest()
            alg = "hmac-sha512"
        else:
            sig = hmac.new(key_material, data, "sha256").digest()
            alg = "hmac-sha256"

        return TransitSignature(
            key_name=key_name,
            key_version=version,
            signature=sig,
            algorithm=alg,
        )

    def verify(self, key_name: str, data: bytes, signature: TransitSignature) -> bool:
        """Verify a signature."""
        tk = self._keys.get(key_name)
        if tk is None:
            raise VaultError(f"transit key not found: {key_name}")

        key_material = self._get_key_material(key_name, signature.key_version)

        if signature.algorithm == "hmac-sha512":
            expected = hmac.new(key_material, data, "sha512").digest()
        else:
            expected = hmac.new(key_material, data, "sha256").digest()

        return hmac.compare_digest(signature.signature, expected)

    def batch_encrypt(self, key_name: str, items: list[bytes]) -> list[TransitCiphertext]:
        return [self.encrypt(key_name, item) for item in items]

    def batch_decrypt(self, key_name: str, items: list[TransitCiphertext]) -> list[bytes]:
        return [self.decrypt(key_name, item) for item in items]

    def list_keys(self) -> list[str]:
        return sorted(self._keys.keys())

    def update_key_config(
        self,
        name: str,
        min_decryption_version: int | None = None,
        min_encryption_version: int | None = None,
        deletion_allowed: bool | None = None,
    ) -> TransitKey:
        """Update configuration for a transit key."""
        tk = self._keys.get(name)
        if tk is None:
            raise VaultError(f"transit key not found: {name}")

        if min_decryption_version is not None:
            if min_decryption_version < 1:
                raise VaultError("min_decryption_version must be >= 1")
            tk.min_decryption_version = min_decryption_version

        if min_encryption_version is not None:
            tk.min_encryption_version = min_encryption_version

        if deletion_allowed is not None:
            tk.deletion_allowed = deletion_allowed

        return tk

    def _get_key_material(self, key_name: str, version: int) -> bytes:
        cache_key = f"{key_name}:v{version}"
        cached = self._key_cache.get(cache_key)
        if cached is not None:
            return cached

        tk = self._keys.get(key_name)
        if tk is None:
            raise VaultError(f"transit key not found: {key_name}")

        kv = tk.key_ring.get_version(version)
        if kv is None:
            raise EncryptionError(f"key version {version} not found for {key_name}")

        self._key_cache[cache_key] = kv.key_material
        return kv.key_material

    def _update_cache(self, key_name: str, version: int, material: bytes) -> None:
        self._key_cache[f"{key_name}:v{version}"] = material

    def _clear_cache(self, key_name: str) -> None:
        to_remove = [k for k in self._key_cache if k.startswith(f"{key_name}:")]
        for k in to_remove:
            del self._key_cache[k]

    @staticmethod
    def _derive_context_key(key_material: bytes, context: bytes) -> bytes:
        """Derive a context-specific key for convergent encryption."""
        return hashlib.sha256(key_material + context).digest()

    def export_key(self, name: str) -> dict[str, Any]:
        """Export a key's metadata and material (if exportable)."""
        tk = self._keys.get(name)
        if tk is None:
            raise VaultError(f"transit key not found: {name}")
        if not tk.exportable:
            raise VaultError(f"key '{name}' is not exportable")
        versions: dict[int, str] = {}
        for v in range(1, tk.key_ring.current_version + 1):
            kv = tk.key_ring.get_version(v)
            if kv and not kv.is_retired:
                versions[v] = kv.key_material.hex()
        return {
            "name": name,
            "key_type": tk.key_type.value,
            "versions": versions,
            "min_decryption_version": tk.min_decryption_version,
        }

    def import_key(
        self,
        name: str,
        key_type: TransitKeyType,
        key_material: bytes,
        exportable: bool = False,
    ) -> TransitKey:
        """Import an external key into the transit engine."""
        if name in self._keys:
            raise VaultError(f"transit key already exists: {name}")
        ring = VersionedKeyRing(name)
        ring.add_version(key_material)
        tk = TransitKey(
            name=name,
            key_type=key_type,
            key_ring=ring,
            exportable=exportable,
        )
        self._keys[name] = tk
        self._update_cache(name, ring.current_version, key_material)
        return tk

    def convergent_encrypt(self, key_name: str, plaintext: bytes, context: bytes) -> TransitCiphertext:
        """Convergent encryption: same plaintext + context = same ciphertext."""
        if not context:
            raise EncryptionError("context is required for convergent encryption")
        tk = self._keys.get(key_name)
        if tk is None:
            raise VaultError(f"transit key not found: {key_name}")
        version = tk.key_ring.current_version
        key_material = self._get_key_material(key_name, version)
        derived = self._derive_context_key(key_material, context)
        nonce = hashlib.sha256(derived + plaintext).digest()[:12]
        ct = encrypt_gcm(plaintext, derived, nonce=nonce)
        return TransitCiphertext(
            key_name=key_name,
            key_version=version,
            ciphertext=ct.ciphertext,
            nonce=ct.nonce,
            tag=ct.tag,
            context=context,
        )

    def generate_datakey(
        self,
        key_name: str,
        key_size: int = 32,
        context: bytes = b"",
    ) -> tuple[bytes, TransitCiphertext]:
        """Generate a new data encryption key, returned as plaintext and wrapped."""
        tk = self._keys.get(key_name)
        if tk is None:
            raise VaultError(f"transit key not found: {key_name}")
        if "hmac" in tk.key_type.value:
            raise EncryptionError("HMAC keys cannot generate data keys")
        plaintext_key = secure_random_bytes(key_size)
        wrapped = self.encrypt(key_name, plaintext_key, context=context)
        return plaintext_key, wrapped

    def generate_datakey_wrapped(
        self,
        key_name: str,
        key_size: int = 32,
        context: bytes = b"",
    ) -> TransitCiphertext:
        """Generate a new data key, returning only the wrapped version."""
        _, wrapped = self.generate_datakey(key_name, key_size, context)
        return wrapped


@dataclass
class BulkTransitResult:
    """Result of a bulk transit operation."""
    index: int
    success: bool
    data: bytes | TransitCiphertext | None = None
    error: str = ""


class BulkTransitOperations:
    """Performs bulk transit operations with per-item error handling."""

    def __init__(self, engine: TransitEngine) -> None:
        self._engine = engine

    def bulk_encrypt(self, key_name: str, items: list[bytes]) -> list[BulkTransitResult]:
        results: list[BulkTransitResult] = []
        for i, plaintext in enumerate(items):
            try:
                ct = self._engine.encrypt(key_name, plaintext)
                results.append(BulkTransitResult(index=i, success=True, data=ct))
            except Exception as e:
                results.append(BulkTransitResult(index=i, success=False, error=str(e)))
        return results

    def bulk_decrypt(self, key_name: str, items: list[TransitCiphertext]) -> list[BulkTransitResult]:
        results: list[BulkTransitResult] = []
        for i, ct in enumerate(items):
            try:
                pt = self._engine.decrypt(key_name, ct)
                results.append(BulkTransitResult(index=i, success=True, data=pt))
            except Exception as e:
                results.append(BulkTransitResult(index=i, success=False, error=str(e)))
        return results

    def bulk_rewrap(self, key_name: str, items: list[TransitCiphertext]) -> list[BulkTransitResult]:
        results: list[BulkTransitResult] = []
        for i, ct in enumerate(items):
            try:
                new_ct = self._engine.rewrap(key_name, ct)
                results.append(BulkTransitResult(index=i, success=True, data=new_ct))
            except Exception as e:
                results.append(BulkTransitResult(index=i, success=False, error=str(e)))
        return results

    def bulk_sign(self, key_name: str, items: list[bytes]) -> list[BulkTransitResult]:
        results: list[BulkTransitResult] = []
        for i, data in enumerate(items):
            try:
                sig = self._engine.sign(key_name, data)
                results.append(BulkTransitResult(index=i, success=True, data=sig.signature))
            except Exception as e:
                results.append(BulkTransitResult(index=i, success=False, error=str(e)))
        return results

    @property
    def engine(self) -> TransitEngine:
        return self._engine


@dataclass
class TransitKeyBackup:
    """Backup of a transit key."""
    backup_id: str
    key_name: str
    key_type: str
    versions: dict[int, bytes]
    created_at: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)


class TransitKeyBackupManager:
    """Manages backups of transit keys."""

    def __init__(self, engine: TransitEngine) -> None:
        self._engine = engine
        self._backups: dict[str, TransitKeyBackup] = {}

    def backup_key(self, key_name: str) -> TransitKeyBackup:
        """Create a backup of a transit key (requires allow_plaintext_backup)."""
        tk = self._engine.get_key(key_name)
        if tk is None:
            raise VaultError(f"transit key not found: {key_name}")
        if not tk.allow_plaintext_backup:
            raise VaultError(f"plaintext backup not allowed for key: {key_name}")
        versions: dict[int, bytes] = {}
        for v in range(1, tk.key_ring.current_version + 1):
            kv = tk.key_ring.get_version(v)
            if kv:
                versions[v] = kv.key_material
        backup = TransitKeyBackup(
            backup_id=generate_id("bak"),
            key_name=key_name,
            key_type=tk.key_type.value,
            versions=versions,
        )
        self._backups[backup.backup_id] = backup
        return backup

    def restore_key(self, backup: TransitKeyBackup) -> TransitKey:
        """Restore a transit key from a backup."""
        if backup.key_name in self._engine._keys:
            raise VaultError(f"key already exists: {backup.key_name}")
        key_type = TransitKeyType(backup.key_type)
        ring = VersionedKeyRing(backup.key_name)
        for v in sorted(backup.versions.keys()):
            ring.add_version(backup.versions[v])
        tk = TransitKey(
            name=backup.key_name,
            key_type=key_type,
            key_ring=ring,
        )
        self._engine._keys[backup.key_name] = tk
        for v, material in backup.versions.items():
            self._engine._update_cache(backup.key_name, v, material)
        return tk

    def list_backups(self) -> list[TransitKeyBackup]:
        return list(self._backups.values())

    def delete_backup(self, backup_id: str) -> bool:
        return self._backups.pop(backup_id, None) is not None

    @property
    def backup_count(self) -> int:
        return len(self._backups)
