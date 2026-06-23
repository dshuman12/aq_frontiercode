"""Envelope encryption with key hierarchy."""
from __future__ import annotations

import hashlib
import hmac
import os
import struct
import time
from dataclasses import dataclass, field
from typing import Any

from vaultkey.crypto.hashing import hash_digest, HashAlgorithm
from vaultkey.crypto.random import generate_id, secure_random_bytes
from vaultkey.crypto.symmetric import (
    CipherMode,
    SymmetricCipher,
    encrypt_gcm,
    decrypt_gcm,
    generate_key,
    GCMCiphertext,
    NONCE_SIZE,
    TAG_SIZE,
)
from vaultkey.utils.errors import CryptoError, EncryptionError


@dataclass(frozen=True)
class WrappedKey:
    """A data key encrypted (wrapped) by a master key."""
    encrypted_key: bytes
    key_id: str
    master_key_id: str
    algorithm: str
    nonce: bytes
    tag: bytes
    created_at: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "encrypted_key": self.encrypted_key.hex(),
            "key_id": self.key_id,
            "master_key_id": self.master_key_id,
            "algorithm": self.algorithm,
            "nonce": self.nonce.hex(),
            "tag": self.tag.hex(),
            "created_at": self.created_at,
        }


@dataclass(frozen=True)
class EnvelopeResult:
    """Result of an envelope encryption operation."""
    ciphertext: bytes
    wrapped_key: WrappedKey
    nonce: bytes
    tag: bytes
    aad: bytes

    def to_dict(self) -> dict[str, Any]:
        return {
            "ciphertext": self.ciphertext.hex(),
            "wrapped_key": self.wrapped_key.to_dict(),
            "nonce": self.nonce.hex(),
            "tag": self.tag.hex(),
        }


@dataclass
class MasterKey:
    """A master encryption key in the key hierarchy."""
    key_id: str
    key_material: bytes
    version: int = 1
    created_at: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)
    is_active: bool = True

    @classmethod
    def generate(cls, key_id: str | None = None, key_size: int = 32) -> MasterKey:
        kid = key_id or generate_id("mk")
        return cls(key_id=kid, key_material=generate_key(key_size))

    def derive_wrapping_key(self, context: bytes = b"wrap") -> bytes:
        """Derive a wrapping key from the master key material."""
        return hashlib.sha256(self.key_material + context + struct.pack(">I", self.version)).digest()


class KeyHierarchy:
    """Manages a hierarchy of master keys and data keys."""

    def __init__(self) -> None:
        self._master_keys: dict[str, MasterKey] = {}
        self._active_master_id: str | None = None
        self._data_keys: dict[str, WrappedKey] = {}
        self._unwrapped_cache: dict[str, bytes] = {}

    def add_master_key(self, master: MasterKey, set_active: bool = True) -> None:
        self._master_keys[master.key_id] = master
        if set_active:
            if self._active_master_id and self._active_master_id in self._master_keys:
                self._master_keys[self._active_master_id].is_active = False
            self._active_master_id = master.key_id

    def get_master_key(self, key_id: str) -> MasterKey | None:
        return self._master_keys.get(key_id)

    @property
    def active_master_key(self) -> MasterKey | None:
        if self._active_master_id:
            return self._master_keys.get(self._active_master_id)
        return None

    def generate_data_key(self, key_size: int = 32) -> tuple[bytes, WrappedKey]:
        """Generate a new data key and wrap it with the active master key."""
        master = self.active_master_key
        if master is None:
            raise CryptoError("no active master key")

        plaintext_key = generate_key(key_size)
        wrapped = self.wrap_key(plaintext_key, master.key_id)
        self._data_keys[wrapped.key_id] = wrapped
        self._unwrapped_cache[wrapped.key_id] = plaintext_key
        return plaintext_key, wrapped

    def wrap_key(self, key_material: bytes, master_key_id: str | None = None) -> WrappedKey:
        """Wrap (encrypt) a data key using a master key."""
        mk_id = master_key_id or self._active_master_id
        if mk_id is None:
            raise CryptoError("no master key specified or active")
        master = self._master_keys.get(mk_id)
        if master is None:
            raise CryptoError(f"master key not found: {mk_id}")

        wrapping_key = master.derive_wrapping_key()
        ct = encrypt_gcm(key_material, wrapping_key)
        key_id = generate_id("dk")

        return WrappedKey(
            encrypted_key=ct.ciphertext,
            key_id=key_id,
            master_key_id=mk_id,
            algorithm="aes-gcm-256",
            nonce=ct.nonce,
            tag=ct.tag,
            created_at=time.time(),
        )

    def unwrap_key(self, wrapped: WrappedKey) -> bytes:
        """Unwrap (decrypt) a data key using the specified master key."""
        if wrapped.key_id in self._unwrapped_cache:
            return self._unwrapped_cache[wrapped.key_id]

        master = self._master_keys.get(wrapped.master_key_id)
        if master is None:
            raise CryptoError(f"master key not found: {wrapped.master_key_id}")

        wrapping_key = master.derive_wrapping_key()
        gcm_ct = GCMCiphertext(
            ciphertext=wrapped.encrypted_key,
            nonce=wrapped.nonce,
            tag=wrapped.tag,
        )
        plaintext_key = decrypt_gcm(gcm_ct, wrapping_key)
        self._unwrapped_cache[wrapped.key_id] = plaintext_key
        return plaintext_key

    def rewrap_key(self, wrapped: WrappedKey, new_master_key_id: str | None = None) -> WrappedKey:
        """Re-wrap a data key under a different master key."""
        plaintext_key = self.unwrap_key(wrapped)
        new_mk_id = new_master_key_id or self._active_master_id
        if new_mk_id is None:
            raise CryptoError("no target master key")

        new_wrapped = self.wrap_key(plaintext_key, new_mk_id)
        self._data_keys[new_wrapped.key_id] = new_wrapped
        self._unwrapped_cache[new_wrapped.key_id] = plaintext_key

        if wrapped.key_id in self._data_keys:
            del self._data_keys[wrapped.key_id]
        if wrapped.key_id in self._unwrapped_cache:
            del self._unwrapped_cache[wrapped.key_id]

        return new_wrapped

    def invalidate_cache(self, key_id: str | None = None) -> None:
        """Clear the unwrapped key cache."""
        if key_id:
            self._unwrapped_cache.pop(key_id, None)
        else:
            self._unwrapped_cache.clear()

    def rotate_master_key(self) -> MasterKey:
        """Generate and activate a new master key."""
        old = self.active_master_key
        new_master = MasterKey.generate()
        if old:
            new_master.version = old.version + 1
            new_master.metadata["rotated_from"] = old.key_id
        self.add_master_key(new_master, set_active=True)
        return new_master

    def list_master_keys(self) -> list[str]:
        return list(self._master_keys.keys())

    def list_data_keys(self) -> list[str]:
        return list(self._data_keys.keys())

    @property
    def master_key_count(self) -> int:
        return len(self._master_keys)


class EnvelopeEncryption:
    """Envelope encryption: encrypt data with a data key, wrap the data key with a master key."""

    def __init__(self, hierarchy: KeyHierarchy | None = None) -> None:
        self._hierarchy = hierarchy or KeyHierarchy()

    @property
    def hierarchy(self) -> KeyHierarchy:
        return self._hierarchy

    def encrypt(self, plaintext: bytes, aad: bytes = b"") -> EnvelopeResult:
        """Encrypt data using envelope encryption."""
        data_key, wrapped_key = self._hierarchy.generate_data_key()

        ct = encrypt_gcm(plaintext, data_key, aad=aad)

        return EnvelopeResult(
            ciphertext=ct.ciphertext,
            wrapped_key=wrapped_key,
            nonce=ct.nonce,
            tag=ct.tag,
            aad=aad,
        )

    def decrypt(self, envelope: EnvelopeResult) -> bytes:
        """Decrypt an envelope-encrypted payload."""
        data_key = self._hierarchy.unwrap_key(envelope.wrapped_key)

        gcm_ct = GCMCiphertext(
            ciphertext=envelope.ciphertext,
            nonce=envelope.nonce,
            tag=envelope.tag,
            aad=envelope.aad,
        )
        return decrypt_gcm(gcm_ct, data_key)

    def reencrypt(self, envelope: EnvelopeResult, new_master_key_id: str | None = None) -> EnvelopeResult:
        """Re-encrypt: decrypt data then re-encrypt under a new master key."""
        plaintext = self.decrypt(envelope)
        new_wrapped = self._hierarchy.rewrap_key(envelope.wrapped_key, new_master_key_id)
        data_key = self._hierarchy.unwrap_key(new_wrapped)

        ct = encrypt_gcm(plaintext, data_key, aad=envelope.aad)

        return EnvelopeResult(
            ciphertext=ct.ciphertext,
            wrapped_key=new_wrapped,
            nonce=ct.nonce,
            tag=ct.tag,
            aad=envelope.aad,
        )


@dataclass
class KeyVersion:
    """Track a specific version of a key."""
    version: int
    key_material: bytes
    created_at: float = field(default_factory=time.time)
    retired_at: float | None = None

    @property
    def is_retired(self) -> bool:
        return self.retired_at is not None


class VersionedKeyRing:
    """A key ring that maintains multiple versions for rotation."""

    def __init__(self, ring_id: str) -> None:
        self.ring_id = ring_id
        self._versions: dict[int, KeyVersion] = {}
        self._current_version: int = 0

    def add_version(self, key_material: bytes) -> KeyVersion:
        self._current_version += 1
        kv = KeyVersion(version=self._current_version, key_material=key_material)
        self._versions[self._current_version] = kv
        return kv

    def get_version(self, version: int) -> KeyVersion | None:
        return self._versions.get(version)

    @property
    def current(self) -> KeyVersion | None:
        return self._versions.get(self._current_version)

    @property
    def current_version(self) -> int:
        return self._current_version

    def retire_version(self, version: int) -> bool:
        kv = self._versions.get(version)
        if kv is None:
            return False
        kv.retired_at = time.time()
        return True

    def active_versions(self) -> list[KeyVersion]:
        return [v for v in self._versions.values() if not v.is_retired]

    def all_versions(self) -> list[KeyVersion]:
        return sorted(self._versions.values(), key=lambda v: v.version)

    @property
    def version_count(self) -> int:
        return len(self._versions)


@dataclass(frozen=True)
class EnvelopeLayer:
    """A single layer in multi-layer envelope encryption."""
    layer_index: int
    wrapped_key: WrappedKey
    ciphertext: bytes
    nonce: bytes
    tag: bytes


class MultiLayerEnvelope:
    """Multi-layer envelope encryption: data is encrypted with nested data keys."""

    def __init__(self, hierarchy: KeyHierarchy, num_layers: int = 2) -> None:
        if num_layers < 1:
            raise CryptoError("at least one layer is required")
        self._hierarchy = hierarchy
        self._num_layers = num_layers

    def encrypt(self, plaintext: bytes, aad: bytes = b"") -> list[EnvelopeLayer]:
        """Encrypt data through multiple layers."""
        layers: list[EnvelopeLayer] = []
        current_data = plaintext
        for i in range(self._num_layers):
            data_key, wrapped = self._hierarchy.generate_data_key()
            ct = encrypt_gcm(current_data, data_key, aad=aad if i == 0 else b"")
            layers.append(EnvelopeLayer(
                layer_index=i,
                wrapped_key=wrapped,
                ciphertext=ct.ciphertext,
                nonce=ct.nonce,
                tag=ct.tag,
            ))
            current_data = ct.ciphertext + ct.nonce + ct.tag
        return layers

    def decrypt(self, layers: list[EnvelopeLayer], aad: bytes = b"") -> bytes:
        """Decrypt through all layers in reverse order."""
        for layer in reversed(layers):
            data_key = self._hierarchy.unwrap_key(layer.wrapped_key)
            gcm_ct = GCMCiphertext(
                ciphertext=layer.ciphertext,
                nonce=layer.nonce,
                tag=layer.tag,
                aad=aad if layer.layer_index == 0 else b"",
            )
            plaintext = decrypt_gcm(gcm_ct, data_key)
            if layer.layer_index > 0:
                pass
        data_key = self._hierarchy.unwrap_key(layers[0].wrapped_key)
        gcm_ct = GCMCiphertext(
            ciphertext=layers[0].ciphertext,
            nonce=layers[0].nonce,
            tag=layers[0].tag,
            aad=aad,
        )
        return decrypt_gcm(gcm_ct, data_key)

    @property
    def num_layers(self) -> int:
        return self._num_layers


@dataclass
class EscrowEntry:
    """A key held in escrow."""
    escrow_id: str
    key_material: bytes
    holder_id: str
    original_key_id: str
    escrowed_at: float = field(default_factory=time.time)
    released: bool = False
    released_at: float | None = None
    release_conditions: dict[str, Any] = field(default_factory=dict)


class KeyEscrowSystem:
    """Manages key escrow for disaster recovery."""

    def __init__(self) -> None:
        self._escrow_entries: dict[str, EscrowEntry] = {}
        self._holder_index: dict[str, list[str]] = {}

    def escrow_key(
        self,
        key_material: bytes,
        holder_id: str,
        original_key_id: str,
        conditions: dict[str, Any] | None = None,
    ) -> EscrowEntry:
        """Place a key in escrow."""
        escrow_id = generate_id("esc")
        entry = EscrowEntry(
            escrow_id=escrow_id,
            key_material=key_material,
            holder_id=holder_id,
            original_key_id=original_key_id,
            release_conditions=dict(conditions or {}),
        )
        self._escrow_entries[escrow_id] = entry
        if holder_id not in self._holder_index:
            self._holder_index[holder_id] = []
        self._holder_index[holder_id].append(escrow_id)
        return entry

    def release_key(self, escrow_id: str) -> bytes:
        """Release a key from escrow."""
        entry = self._escrow_entries.get(escrow_id)
        if entry is None:
            raise CryptoError(f"escrow entry not found: {escrow_id}")
        if entry.released:
            raise CryptoError("key already released")
        entry.released = True
        entry.released_at = time.time()
        return entry.key_material

    def list_by_holder(self, holder_id: str) -> list[EscrowEntry]:
        ids = self._holder_index.get(holder_id, [])
        return [self._escrow_entries[eid] for eid in ids if eid in self._escrow_entries]

    def revoke_escrow(self, escrow_id: str) -> bool:
        entry = self._escrow_entries.pop(escrow_id, None)
        if entry is None:
            return False
        ids = self._holder_index.get(entry.holder_id, [])
        if escrow_id in ids:
            ids.remove(escrow_id)
        return True

    @property
    def total_entries(self) -> int:
        return len(self._escrow_entries)

    @property
    def unreleased_count(self) -> int:
        return sum(1 for e in self._escrow_entries.values() if not e.released)


@dataclass
class ExportedKey:
    """A key exported for backup or transfer."""
    export_id: str
    key_material_encrypted: bytes
    wrapping_nonce: bytes
    wrapping_tag: bytes
    original_key_id: str
    algorithm: str
    exported_at: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)


class KeyExportImport:
    """Export and import keys with encryption wrapping."""

    def __init__(self, wrapping_key: bytes) -> None:
        if len(wrapping_key) not in (16, 24, 32):
            raise CryptoError("wrapping key must be 16, 24, or 32 bytes")
        self._wrapping_key = wrapping_key

    def export_key(self, key_material: bytes, original_key_id: str, algorithm: str = "aes-gcm") -> ExportedKey:
        """Export a key by encrypting it with the wrapping key."""
        ct = encrypt_gcm(key_material, self._wrapping_key)
        return ExportedKey(
            export_id=generate_id("exp"),
            key_material_encrypted=ct.ciphertext,
            wrapping_nonce=ct.nonce,
            wrapping_tag=ct.tag,
            original_key_id=original_key_id,
            algorithm=algorithm,
        )

    def import_key(self, exported: ExportedKey) -> bytes:
        """Import a key by decrypting it with the wrapping key."""
        gcm_ct = GCMCiphertext(
            ciphertext=exported.key_material_encrypted,
            nonce=exported.wrapping_nonce,
            tag=exported.wrapping_tag,
        )
        return decrypt_gcm(gcm_ct, self._wrapping_key)


@dataclass
class EncryptionContextBinding:
    """Binds encryption to a specific context for domain separation."""
    context_name: str
    context_data: dict[str, str]
    binding_hash: bytes = b""

    def __post_init__(self) -> None:
        if not self.binding_hash:
            canonical = "|".join(f"{k}={v}" for k, v in sorted(self.context_data.items()))
            self.binding_hash = hash_digest(
                (self.context_name + ":" + canonical).encode(), HashAlgorithm.SHA256
            )

    def as_aad(self) -> bytes:
        """Return the context binding as AAD for authenticated encryption."""
        return self.binding_hash

    def matches(self, other: EncryptionContextBinding) -> bool:
        import hmac as _hmac
        return _hmac.compare_digest(self.binding_hash, other.binding_hash)


class EncryptionContextBinder:
    """Manages encryption context bindings."""

    def __init__(self) -> None:
        self._bindings: dict[str, EncryptionContextBinding] = {}

    def create_binding(self, name: str, context_data: dict[str, str]) -> EncryptionContextBinding:
        binding = EncryptionContextBinding(context_name=name, context_data=context_data)
        self._bindings[name] = binding
        return binding

    def get_binding(self, name: str) -> EncryptionContextBinding | None:
        return self._bindings.get(name)

    def remove_binding(self, name: str) -> bool:
        return self._bindings.pop(name, None) is not None

    def list_bindings(self) -> list[str]:
        return sorted(self._bindings.keys())


@dataclass
class KeyMetadataEntry:
    """Metadata about a key in the registry."""
    key_id: str
    algorithm: str
    key_type: str
    created_at: float = field(default_factory=time.time)
    rotated_at: float | None = None
    expires_at: float | None = None
    tags: dict[str, str] = field(default_factory=dict)
    usage_count: int = 0

    def record_usage(self) -> None:
        self.usage_count += 1

    @property
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return time.time() >= self.expires_at

    def to_dict(self) -> dict[str, Any]:
        return {
            "key_id": self.key_id,
            "algorithm": self.algorithm,
            "key_type": self.key_type,
            "created_at": self.created_at,
            "usage_count": self.usage_count,
            "is_expired": self.is_expired,
        }


class KeyMetadataRegistry:
    """Registry for tracking key metadata without storing key material."""

    def __init__(self) -> None:
        self._entries: dict[str, KeyMetadataEntry] = {}

    def register(
        self,
        key_id: str,
        algorithm: str,
        key_type: str = "symmetric",
        expires_at: float | None = None,
        tags: dict[str, str] | None = None,
    ) -> KeyMetadataEntry:
        entry = KeyMetadataEntry(
            key_id=key_id,
            algorithm=algorithm,
            key_type=key_type,
            expires_at=expires_at,
            tags=dict(tags or {}),
        )
        self._entries[key_id] = entry
        return entry

    def get(self, key_id: str) -> KeyMetadataEntry | None:
        return self._entries.get(key_id)

    def record_usage(self, key_id: str) -> bool:
        entry = self._entries.get(key_id)
        if entry is None:
            return False
        entry.record_usage()
        return True

    def remove(self, key_id: str) -> bool:
        return self._entries.pop(key_id, None) is not None

    def list_keys(self, key_type: str | None = None) -> list[KeyMetadataEntry]:
        entries = list(self._entries.values())
        if key_type:
            entries = [e for e in entries if e.key_type == key_type]
        return entries

    def find_expired(self) -> list[KeyMetadataEntry]:
        return [e for e in self._entries.values() if e.is_expired]

    def find_by_tag(self, tag_key: str, tag_value: str) -> list[KeyMetadataEntry]:
        return [e for e in self._entries.values() if e.tags.get(tag_key) == tag_value]

    @property
    def total_count(self) -> int:
        return len(self._entries)
