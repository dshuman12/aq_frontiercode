"""Tests for vault module — store, rotation, sealing, transit."""
from __future__ import annotations

import time
import pytest

from vaultkey.vault.store import (
    SecretStore, SecretVersion, SecretMetadata, SecretEntry,
    SecretState, GetResult,
)
from vaultkey.vault.rotation import (
    RotationManager, RotationPolicy, RotationRecord, RotationState,
)
from vaultkey.vault.sealing import (
    SealManager, SealState, SealShare, generate_shares,
    reconstruct_secret, PRIME,
)
from vaultkey.vault.transit import (
    TransitEngine, TransitKeyType, TransitCiphertext, TransitSignature,
)
from vaultkey.utils.errors import (
    SecretNotFound, SecretVersionNotFound, VaultError,
    SealedError, UnsealError, EncryptionError, RotationError,
)


class TestSecretStore:
    def test_put_and_get(self):
        store = SecretStore()
        store.put("secret/db", b"password123")
        result = store.get("secret/db")
        assert result.value == b"password123"
        assert result.version == 1

    def test_versioning(self):
        store = SecretStore()
        store.put("secret/db", b"v1")
        store.put("secret/db", b"v2")
        result = store.get("secret/db")
        assert result.value == b"v2"
        assert result.version == 2

    def test_get_specific_version(self):
        store = SecretStore()
        store.put("secret/db", b"v1")
        store.put("secret/db", b"v2")
        r1 = store.get("secret/db", version=1)
        assert r1.value == b"v1"

    def test_not_found(self):
        store = SecretStore()
        with pytest.raises(SecretNotFound):
            store.get("nonexistent")

    def test_version_not_found(self):
        store = SecretStore()
        store.put("secret/db", b"v1")
        with pytest.raises(SecretVersionNotFound):
            store.get("secret/db", version=99)

    def test_soft_delete(self):
        store = SecretStore()
        store.put("secret/db", b"v1")
        count = store.delete("secret/db")
        assert count == 1
        with pytest.raises(SecretNotFound):
            store.get("secret/db")

    def test_undelete(self):
        store = SecretStore()
        store.put("secret/db", b"v1")
        store.delete("secret/db")
        count = store.undelete("secret/db")
        assert count == 1
        result = store.get("secret/db")
        assert result.value == b"v1"

    def test_destroy(self):
        store = SecretStore()
        store.put("secret/db", b"v1")
        count = store.destroy("secret/db")
        assert count == 1
        with pytest.raises(SecretNotFound):
            store.get("secret/db")

    def test_destroy_specific_versions(self):
        store = SecretStore()
        store.put("secret/db", b"v1")
        store.put("secret/db", b"v2")
        store.destroy("secret/db", versions=[1])
        result = store.get("secret/db")
        assert result.value == b"v2"

    def test_list_secrets(self):
        store = SecretStore()
        store.put("secret/a", b"1")
        store.put("secret/b", b"2")
        store.put("other/c", b"3")
        secrets = store.list_secrets("secret/")
        assert len(secrets) == 2

    def test_list_versions(self):
        store = SecretStore()
        store.put("secret/db", b"v1")
        store.put("secret/db", b"v2")
        versions = store.list_versions("secret/db")
        assert len(versions) == 2

    def test_metadata(self):
        store = SecretStore()
        store.put("secret/db", b"v1", metadata={"owner": "dba"})
        meta = store.get_metadata("secret/db")
        assert meta.custom_metadata["owner"] == "dba"

    def test_update_metadata(self):
        store = SecretStore()
        store.put("secret/db", b"v1")
        meta = store.update_metadata("secret/db", max_versions=5, cas_required=True)
        assert meta.max_versions == 5
        assert meta.cas_required

    def test_cas(self):
        store = SecretStore()
        store.put("secret/db", b"v1")
        store.update_metadata("secret/db", cas_required=True)
        store.put("secret/db", b"v2", cas=1)
        result = store.get("secret/db")
        assert result.value == b"v2"

    def test_cas_mismatch(self):
        store = SecretStore()
        store.put("secret/db", b"v1")
        store.update_metadata("secret/db", cas_required=True)
        with pytest.raises(VaultError, match="CAS mismatch"):
            store.put("secret/db", b"v2", cas=99)

    def test_max_versions(self):
        store = SecretStore(default_max_versions=3)
        for i in range(5):
            store.put("secret/db", f"v{i}".encode())
        versions = store.list_versions("secret/db")
        active = [v for v in versions if v["state"] == "active"]
        assert len(active) <= 3

    def test_namespaces(self):
        store = SecretStore()
        store.create_namespace("prod")
        store.put("db/pass", b"prod_pw", namespace="prod")
        store.put("db/pass", b"default_pw")
        assert store.get("db/pass", namespace="prod").value == b"prod_pw"
        assert store.get("db/pass").value == b"default_pw"

    def test_delete_namespace(self):
        store = SecretStore()
        store.create_namespace("test")
        store.put("a", b"1", namespace="test")
        count = store.delete_namespace("test")
        assert count == 1

    def test_delete_default_namespace_raises(self):
        store = SecretStore()
        with pytest.raises(VaultError):
            store.delete_namespace("default")

    def test_list_namespaces(self):
        store = SecretStore()
        store.create_namespace("ns1")
        ns = store.list_namespaces()
        assert "default" in ns
        assert "ns1" in ns

    def test_batch_put(self):
        store = SecretStore()
        results = store.batch_put([("a", b"1"), ("b", b"2")])
        assert len(results) == 2

    def test_batch_get(self):
        store = SecretStore()
        store.put("a", b"1")
        store.put("b", b"2")
        results = store.batch_get(["a", "b", "c"])
        assert results["a"] is not None
        assert results["c"] is None

    def test_count(self):
        store = SecretStore()
        store.put("a", b"1")
        store.put("b", b"2")
        assert store.count() == 2

    def test_glob(self):
        store = SecretStore()
        store.put("secret/db/pass", b"1")
        store.put("secret/db/user", b"2")
        store.put("other/thing", b"3")
        matches = store.glob("secret/db/*")
        assert len(matches) == 2

    def test_checksum(self):
        store = SecretStore()
        store.put("secret/db", b"password")
        result = store.get("secret/db")
        assert len(result.checksum) > 0

    def test_secret_version_states(self):
        sv = SecretVersion(version=1, value=b"test")
        assert sv.is_active
        sv.soft_delete()
        assert sv.state == SecretState.DELETED
        sv.restore()
        assert sv.is_active
        sv.destroy()
        assert sv.state == SecretState.DESTROYED
        assert sv.value == b""

    def test_restore_destroyed_raises(self):
        sv = SecretVersion(version=1, value=b"test")
        sv.destroy()
        with pytest.raises(VaultError):
            sv.restore()

    def test_metadata_to_dict(self):
        meta = SecretMetadata(path="test", namespace="default")
        d = meta.to_dict()
        assert d["path"] == "test"


class TestRotationManager:
    def test_add_policy(self):
        rm = RotationManager()
        policy = RotationPolicy(policy_id="p1", path_pattern="secret/*", rotation_interval=86400)
        rm.add_policy(policy)
        assert rm.get_policy("p1") == policy

    def test_remove_policy(self):
        rm = RotationManager()
        policy = RotationPolicy(policy_id="p1", path_pattern="*", rotation_interval=86400)
        rm.add_policy(policy)
        assert rm.remove_policy("p1")
        assert not rm.remove_policy("p1")

    def test_start_complete_rotation(self):
        rm = RotationManager()
        record = rm.start_rotation("secret/db", 1, 2)
        assert record.state == RotationState.IN_PROGRESS
        completed = rm.complete_rotation("secret/db")
        assert completed.state == RotationState.COMPLETED

    def test_fail_rotation(self):
        rm = RotationManager()
        rm.start_rotation("secret/db", 1, 2)
        failed = rm.fail_rotation("secret/db", "some error")
        assert failed.state == RotationState.FAILED
        assert failed.error == "some error"

    def test_rollback_rotation(self):
        rm = RotationManager()
        rm.start_rotation("secret/db", 1, 2)
        rb = rm.rollback_rotation("secret/db")
        assert rb.state == RotationState.ROLLED_BACK

    def test_double_rotation_raises(self):
        rm = RotationManager()
        rm.start_rotation("secret/db", 1, 2)
        with pytest.raises(RotationError):
            rm.start_rotation("secret/db", 2, 3)

    def test_complete_nonexistent_raises(self):
        rm = RotationManager()
        with pytest.raises(RotationError):
            rm.complete_rotation("nonexistent")

    def test_history(self):
        rm = RotationManager()
        rm.start_rotation("secret/db", 1, 2)
        rm.complete_rotation("secret/db")
        history = rm.get_history("secret/db")
        assert len(history) == 1

    def test_last_rotation_time(self):
        rm = RotationManager()
        rm.start_rotation("secret/db", 1, 2)
        rm.complete_rotation("secret/db")
        t = rm.get_last_rotation_time("secret/db")
        assert t is not None

    def test_paths_due_for_rotation(self):
        rm = RotationManager()
        policy = RotationPolicy(policy_id="p1", path_pattern="secret/*", rotation_interval=100)
        rm.add_policy(policy)
        rm.set_last_rotation_time("secret/db", time.time() - 200)
        due = rm.paths_due_for_rotation()
        assert len(due) == 1

    def test_grace_period(self):
        rm = RotationManager()
        policy = RotationPolicy(policy_id="p1", path_pattern="secret/*", rotation_interval=100, grace_period=50)
        rm.add_policy(policy)
        rm.set_last_rotation_time("secret/db", time.time() - 10)
        assert rm.is_in_grace_period("secret/db")

    def test_cache_key(self):
        rm = RotationManager()
        rm.cache_key("path", "some_key_data")
        assert rm.get_cached_key("path") == "some_key_data"

    def test_invalidate_on_complete(self):
        rm = RotationManager()
        rm.cache_key("secret/db", "old_key")
        rm.start_rotation("secret/db", 1, 2)
        rm.complete_rotation("secret/db")
        assert rm.get_cached_key("secret/db") is None

    def test_callbacks(self):
        rm = RotationManager()
        records: list[RotationRecord] = []
        rm.register_callback(lambda r: records.append(r))
        rm.start_rotation("secret/db", 1, 2)
        rm.complete_rotation("secret/db")
        assert len(records) == 1

    def test_policy_is_due(self):
        policy = RotationPolicy(policy_id="p1", path_pattern="*", rotation_interval=100)
        assert policy.is_due(time.time() - 200)
        assert not policy.is_due(time.time() - 50)

    def test_policy_to_dict(self):
        policy = RotationPolicy(policy_id="p1", path_pattern="*", rotation_interval=100)
        d = policy.to_dict()
        assert d["policy_id"] == "p1"

    def test_record_to_dict(self):
        record = RotationRecord(
            record_id="r1", path="secret/db", old_version=1,
            new_version=2, policy_id=None, state=RotationState.COMPLETED,
        )
        d = record.to_dict()
        assert d["path"] == "secret/db"


class TestSealManager:
    def test_initialize(self):
        sm = SealManager(shares=5, threshold=3)
        keys = sm.initialize()
        assert len(keys) == 5
        assert sm.is_sealed

    def test_unseal(self):
        sm = SealManager(shares=5, threshold=3)
        keys = sm.initialize()
        for key in keys[:3]:
            sm.unseal(key)
        assert not sm.is_sealed
        assert sm.root_key is not None

    def test_partial_unseal(self):
        sm = SealManager(shares=5, threshold=3)
        keys = sm.initialize()
        sm.unseal(keys[0])
        sm.unseal(keys[1])
        assert sm.is_sealed
        assert sm.status.progress == 2

    def test_seal_after_unseal(self):
        sm = SealManager(shares=5, threshold=3)
        keys = sm.initialize()
        for key in keys[:3]:
            sm.unseal(key)
        sm.seal()
        assert sm.is_sealed

    def test_duplicate_share_raises(self):
        sm = SealManager(shares=5, threshold=3)
        keys = sm.initialize()
        sm.unseal(keys[0])
        with pytest.raises(UnsealError):
            sm.unseal(keys[0])

    def test_different_share_combinations(self):
        sm = SealManager(shares=5, threshold=3)
        keys = sm.initialize()

        sm2 = SealManager(shares=5, threshold=3)
        sm2._status = sm._status.__class__(
            state=SealState.SEALED,
            threshold=sm._threshold,
            total_shares=sm._total_shares,
        )
        sm2._root_key_int = sm._root_key_int

        for key in keys[2:5]:
            sm.unseal(key)
        assert not sm.is_sealed

    def test_require_unsealed(self):
        sm = SealManager()
        sm.initialize()
        with pytest.raises(SealedError):
            sm.require_unsealed()

    def test_root_key_none_when_sealed(self):
        sm = SealManager()
        sm.initialize()
        assert sm.root_key is None

    def test_reset_progress(self):
        sm = SealManager(shares=5, threshold=3)
        keys = sm.initialize()
        sm.unseal(keys[0])
        sm.reset_unseal_progress()
        assert sm.status.progress == 0

    def test_seal_status_to_dict(self):
        sm = SealManager()
        d = sm.status.to_dict()
        assert "state" in d

    def test_uninitialized_unseal_raises(self):
        sm = SealManager()
        with pytest.raises(UnsealError):
            sm.unseal("1:abc123")

    def test_already_unsealed_raises(self):
        sm = SealManager(shares=5, threshold=3)
        keys = sm.initialize()
        for key in keys[:3]:
            sm.unseal(key)
        with pytest.raises(UnsealError):
            sm.unseal(keys[3])

    def test_already_initialized_raises(self):
        sm = SealManager()
        sm.initialize()
        with pytest.raises(UnsealError):
            sm.initialize()

    def test_seal_uninitialized_raises(self):
        sm = SealManager()
        with pytest.raises(UnsealError):
            sm.seal()


class TestShamirShares:
    def test_generate_and_reconstruct(self):
        secret = 12345678
        shares = generate_shares(secret, 3, 5)
        reconstructed = reconstruct_secret(shares[:3])
        assert reconstructed == secret

    def test_different_combinations(self):
        secret = 9999999
        shares = generate_shares(secret, 3, 5)
        assert reconstruct_secret([shares[0], shares[2], shares[4]]) == secret
        assert reconstruct_secret([shares[1], shares[3], shares[4]]) == secret

    def test_threshold_2(self):
        secret = 42
        shares = generate_shares(secret, 2, 3)
        assert reconstruct_secret(shares[:2]) == secret

    def test_all_shares(self):
        secret = 100
        shares = generate_shares(secret, 3, 5)
        assert reconstruct_secret(shares) == secret

    def test_invalid_threshold(self):
        with pytest.raises(UnsealError):
            generate_shares(100, 1, 5)

    def test_too_few_shares(self):
        with pytest.raises(UnsealError):
            generate_shares(100, 5, 3)

    def test_share_to_hex(self):
        shares = generate_shares(100, 2, 3)
        hex_str = shares[0].to_hex()
        restored = SealShare.from_hex(hex_str)
        assert restored.index == shares[0].index
        assert restored.value == shares[0].value

    def test_too_few_shares_for_reconstruct(self):
        with pytest.raises(UnsealError):
            reconstruct_secret([SealShare(index=1, value=100, share_id="s1")])


class TestTransitEngine:
    def test_create_key(self):
        te = TransitEngine()
        tk = te.create_key("my-key")
        assert tk.name == "my-key"
        assert tk.latest_version == 1

    def test_encrypt_decrypt(self):
        te = TransitEngine()
        te.create_key("k1")
        ct = te.encrypt("k1", b"hello")
        pt = te.decrypt("k1", ct)
        assert pt == b"hello"

    def test_rotate_and_decrypt_old(self):
        te = TransitEngine()
        te.create_key("k1")
        ct = te.encrypt("k1", b"hello")
        te.rotate_key("k1")
        pt = te.decrypt("k1", ct)
        assert pt == b"hello"

    def test_rewrap(self):
        te = TransitEngine()
        te.create_key("k1")
        ct = te.encrypt("k1", b"hello")
        te.rotate_key("k1")
        rewrapped = te.rewrap("k1", ct)
        assert rewrapped.key_version == 2
        pt = te.decrypt("k1", rewrapped)
        assert pt == b"hello"

    def test_sign_verify(self):
        te = TransitEngine()
        te.create_key("hmac-key", TransitKeyType.HMAC_SHA256)
        sig = te.sign("hmac-key", b"data")
        assert te.verify("hmac-key", b"data", sig)
        assert not te.verify("hmac-key", b"other", sig)

    def test_sign_sha512(self):
        te = TransitEngine()
        te.create_key("hmac-key", TransitKeyType.HMAC_SHA512)
        sig = te.sign("hmac-key", b"data")
        assert sig.algorithm == "hmac-sha512"
        assert te.verify("hmac-key", b"data", sig)

    def test_hmac_key_cannot_encrypt(self):
        te = TransitEngine()
        te.create_key("hmac-key", TransitKeyType.HMAC_SHA256)
        with pytest.raises(EncryptionError):
            te.encrypt("hmac-key", b"data")

    def test_batch_encrypt_decrypt(self):
        te = TransitEngine()
        te.create_key("k1")
        items = [b"a", b"b", b"c"]
        cts = te.batch_encrypt("k1", items)
        pts = te.batch_decrypt("k1", cts)
        assert pts == items

    def test_min_decryption_version(self):
        te = TransitEngine()
        te.create_key("k1")
        ct = te.encrypt("k1", b"hello")
        te.rotate_key("k1")
        te.update_key_config("k1", min_decryption_version=2)
        with pytest.raises(EncryptionError):
            te.decrypt("k1", ct)

    def test_context_encryption(self):
        te = TransitEngine()
        te.create_key("k1")
        ct = te.encrypt("k1", b"hello", context=b"ctx1")
        pt = te.decrypt("k1", ct, context=b"ctx1")
        assert pt == b"hello"

    def test_list_keys(self):
        te = TransitEngine()
        te.create_key("a")
        te.create_key("b")
        assert te.list_keys() == ["a", "b"]

    def test_delete_key(self):
        te = TransitEngine()
        tk = te.create_key("k1")
        te.update_key_config("k1", deletion_allowed=True)
        assert te.delete_key("k1")

    def test_delete_not_allowed(self):
        te = TransitEngine()
        te.create_key("k1")
        with pytest.raises(VaultError):
            te.delete_key("k1")

    def test_duplicate_key_raises(self):
        te = TransitEngine()
        te.create_key("k1")
        with pytest.raises(VaultError):
            te.create_key("k1")

    def test_nonexistent_key_raises(self):
        te = TransitEngine()
        with pytest.raises(VaultError):
            te.encrypt("nope", b"data")

    def test_transit_ciphertext_serialize(self):
        te = TransitEngine()
        te.create_key("k1")
        ct = te.encrypt("k1", b"test")
        s = ct.serialize()
        restored = TransitCiphertext.deserialize("k1", s)
        pt = te.decrypt("k1", restored)
        assert pt == b"test"

    def test_transit_signature_serialize(self):
        te = TransitEngine()
        te.create_key("hmac-key", TransitKeyType.HMAC_SHA256)
        sig = te.sign("hmac-key", b"data")
        s = sig.serialize()
        restored = TransitSignature.deserialize("hmac-key", s)
        assert te.verify("hmac-key", b"data", restored)

    def test_update_key_config(self):
        te = TransitEngine()
        te.create_key("k1")
        tk = te.update_key_config("k1", deletion_allowed=True, min_encryption_version=1)
        assert tk.deletion_allowed
        assert tk.min_encryption_version == 1

    def test_key_to_dict(self):
        te = TransitEngine()
        tk = te.create_key("k1")
        d = tk.to_dict()
        assert d["name"] == "k1"

    def test_aes128_gcm(self):
        te = TransitEngine()
        te.create_key("k128", TransitKeyType.AES128_GCM)
        ct = te.encrypt("k128", b"hello")
        pt = te.decrypt("k128", ct)
        assert pt == b"hello"


# ---------------------------------------------------------------------------
# EXPANDED TESTS — appended below existing tests
# ---------------------------------------------------------------------------


class TestSecretStoreExtended:
    def test_concurrent_put_get_same_path(self):
        store = SecretStore()
        for i in range(20):
            store.put("secret/db", f"v{i}".encode())
        result = store.get("secret/db")
        assert result.version == 20
        assert result.value == b"v19"

    def test_batch_put_many(self):
        store = SecretStore()
        items = [(f"key/{i}", f"val-{i}".encode()) for i in range(50)]
        results = store.batch_put(items)
        assert len(results) == 50
        assert store.count() == 50

    def test_batch_get_mixed_hits_misses(self):
        store = SecretStore()
        store.put("a", b"1")
        store.put("c", b"3")
        results = store.batch_get(["a", "b", "c", "d"])
        assert results["a"] is not None
        assert results["b"] is None
        assert results["c"] is not None
        assert results["d"] is None

    def test_batch_put_same_key_increments_version(self):
        store = SecretStore()
        items = [("same", f"v{i}".encode()) for i in range(5)]
        results = store.batch_put(items)
        assert results[-1].version == 5

    def test_namespace_list_secrets(self):
        store = SecretStore()
        store.create_namespace("ns1")
        store.put("a", b"1", namespace="ns1")
        store.put("b", b"2", namespace="ns1")
        store.put("c", b"3")
        assert len(store.list_secrets(namespace="ns1")) == 2
        assert len(store.list_secrets()) == 1

    def test_namespace_count(self):
        store = SecretStore()
        store.create_namespace("ns1")
        store.put("a", b"1", namespace="ns1")
        store.put("b", b"2", namespace="ns1")
        assert store.count(namespace="ns1") == 2

    def test_namespace_glob(self):
        store = SecretStore()
        store.create_namespace("prod")
        store.put("db/pass", b"1", namespace="prod")
        store.put("db/user", b"2", namespace="prod")
        store.put("api/key", b"3", namespace="prod")
        matches = store.glob("db/*", namespace="prod")
        assert len(matches) == 2

    def test_namespace_already_exists(self):
        store = SecretStore()
        store.create_namespace("ns1")
        with pytest.raises(VaultError):
            store.create_namespace("ns1")

    def test_delete_nonexistent_namespace(self):
        store = SecretStore()
        with pytest.raises(VaultError):
            store.delete_namespace("nonexistent")

    def test_auto_namespace_creation(self):
        store = SecretStore()
        store.put("a", b"1", namespace="auto_ns")
        result = store.get("a", namespace="auto_ns")
        assert result.value == b"1"

    def test_delete_specific_versions_list(self):
        store = SecretStore()
        store.put("s", b"v1")
        store.put("s", b"v2")
        store.put("s", b"v3")
        count = store.delete("s", versions=[1, 2])
        assert count == 2
        result = store.get("s")
        assert result.value == b"v3"

    def test_undelete_specific_versions(self):
        store = SecretStore()
        store.put("s", b"v1")
        store.put("s", b"v2")
        store.delete("s", versions=[1, 2])
        count = store.undelete("s", versions=[1])
        assert count == 1
        result = store.get("s", version=1)
        assert result.value == b"v1"

    def test_destroy_then_get_raises(self):
        store = SecretStore()
        store.put("s", b"v1")
        store.put("s", b"v2")
        store.destroy("s", versions=[2])
        with pytest.raises(SecretVersionNotFound):
            store.get("s", version=2)

    def test_max_versions_enforcement(self):
        store = SecretStore(default_max_versions=3)
        for i in range(10):
            store.put("s", f"v{i}".encode())
        versions = store.list_versions("s")
        active = [v for v in versions if v["state"] == "active"]
        assert len(active) <= 3

    def test_update_metadata_custom(self):
        store = SecretStore()
        store.put("s", b"v1")
        meta = store.update_metadata("s", custom_metadata={"env": "prod", "team": "infra"})
        assert meta.custom_metadata["env"] == "prod"
        assert meta.custom_metadata["team"] == "infra"

    def test_cas_first_write(self):
        store = SecretStore()
        store.put("s", b"v1")
        store.update_metadata("s", cas_required=True)
        store.put("s", b"v2", cas=1)
        assert store.get("s").version == 2

    def test_glob_no_match(self):
        store = SecretStore()
        store.put("secret/a", b"1")
        assert store.glob("other/*") == []

    def test_glob_nonexistent_namespace(self):
        store = SecretStore()
        assert store.glob("*", namespace="nope") == []

    def test_list_secrets_nonexistent_namespace(self):
        store = SecretStore()
        assert store.list_secrets(namespace="nope") == []

    def test_secret_entry_active_versions(self):
        store = SecretStore()
        store.put("s", b"v1")
        store.put("s", b"v2")
        store.put("s", b"v3")
        store.delete("s", versions=[2])
        entry = store._secrets["default/s"]
        active = entry.active_versions()
        assert 2 not in active
        assert 1 in active
        assert 3 in active


class TestRotationManagerExtended:
    def test_overlapping_rotation_blocked(self):
        rm = RotationManager()
        rm.start_rotation("path/a", 1, 2)
        with pytest.raises(RotationError):
            rm.start_rotation("path/a", 2, 3)

    def test_fail_then_start_again(self):
        rm = RotationManager()
        rm.start_rotation("path/a", 1, 2)
        rm.fail_rotation("path/a", "error")
        record = rm.start_rotation("path/a", 1, 2)
        assert record.state == RotationState.IN_PROGRESS

    def test_rollback_then_start_again(self):
        rm = RotationManager()
        rm.start_rotation("path/a", 1, 2)
        rm.rollback_rotation("path/a")
        record = rm.start_rotation("path/a", 1, 2)
        assert record.state == RotationState.IN_PROGRESS

    def test_multiple_paths_rotation(self):
        rm = RotationManager()
        rm.start_rotation("a", 1, 2)
        rm.start_rotation("b", 1, 2)
        assert rm.active_rotation_count() == 2
        rm.complete_rotation("a")
        rm.complete_rotation("b")
        assert rm.active_rotation_count() == 0

    def test_total_rotations(self):
        rm = RotationManager()
        for i in range(5):
            rm.start_rotation("path", i, i + 1)
            rm.complete_rotation("path")
        assert rm.total_rotations("path") == 5
        assert rm.total_rotations() == 5

    def test_callback_receives_completed_record(self):
        rm = RotationManager()
        records: list[RotationRecord] = []
        rm.register_callback(lambda r: records.append(r))
        rm.start_rotation("p", 1, 2)
        rm.complete_rotation("p")
        assert records[0].state == RotationState.COMPLETED

    def test_callback_exception_does_not_propagate(self):
        rm = RotationManager()
        rm.register_callback(lambda r: (_ for _ in ()).throw(RuntimeError("boom")))
        rm.start_rotation("p", 1, 2)
        rm.complete_rotation("p")

    def test_policy_needs_notification(self):
        policy = RotationPolicy(
            policy_id="p1", path_pattern="*",
            rotation_interval=1000, notify_before=200,
        )
        now = time.time()
        last = now - 850
        assert policy.needs_notification(last, now=now)

    def test_policy_no_notification_too_early(self):
        policy = RotationPolicy(
            policy_id="p1", path_pattern="*",
            rotation_interval=1000, notify_before=200,
        )
        now = time.time()
        last = now - 100
        assert not policy.needs_notification(last, now=now)

    def test_invalidate_all_caches(self):
        rm = RotationManager()
        rm.cache_key("a", "data_a")
        rm.cache_key("b", "data_b")
        rm.invalidate_all_caches()
        assert rm.get_cached_key("a") is None
        assert rm.get_cached_key("b") is None

    def test_fail_nonexistent_raises(self):
        rm = RotationManager()
        with pytest.raises(RotationError):
            rm.fail_rotation("nonexistent", "error")

    def test_rollback_nonexistent_raises(self):
        rm = RotationManager()
        with pytest.raises(RotationError):
            rm.rollback_rotation("nonexistent")


class TestSealManagerExtended:
    def test_minimal_shares_threshold_2(self):
        sm = SealManager(shares=2, threshold=2)
        keys = sm.initialize()
        assert len(keys) == 2
        for key in keys:
            sm.unseal(key)
        assert not sm.is_sealed

    def test_share_hex_roundtrip(self):
        shares = generate_shares(42, 2, 3)
        for share in shares:
            hex_str = share.to_hex()
            restored = SealShare.from_hex(hex_str)
            assert restored.index == share.index
            assert restored.value == share.value

    def test_invalid_share_format(self):
        with pytest.raises(UnsealError):
            SealShare.from_hex("invalid_format")

    def test_seal_time_set(self):
        sm = SealManager(shares=3, threshold=2)
        sm.initialize()
        assert sm.seal_time is not None

    def test_unseal_time_set(self):
        sm = SealManager(shares=3, threshold=2)
        keys = sm.initialize()
        for key in keys[:2]:
            sm.unseal(key)
        assert sm.unseal_time is not None

    def test_is_initialized(self):
        sm = SealManager()
        assert not sm.is_initialized
        sm.initialize()
        assert sm.is_initialized

    def test_seal_status_progress(self):
        sm = SealManager(shares=5, threshold=3)
        keys = sm.initialize()
        sm.unseal(keys[0])
        assert sm.status.progress == 1
        sm.unseal(keys[1])
        assert sm.status.progress == 2

    def test_large_secret_shamir(self):
        secret = 2**126 - 1
        shares = generate_shares(secret, 3, 5)
        reconstructed = reconstruct_secret(shares[:3])
        assert reconstructed == secret

    def test_duplicate_share_indices_raises(self):
        shares = [
            SealShare(index=1, value=100, share_id="s1"),
            SealShare(index=1, value=200, share_id="s2"),
        ]
        with pytest.raises(UnsealError):
            reconstruct_secret(shares)

    def test_seal_clears_root_key(self):
        sm = SealManager(shares=3, threshold=2)
        keys = sm.initialize()
        for key in keys[:2]:
            sm.unseal(key)
        assert sm.root_key is not None
        sm.seal()
        assert sm.root_key is None


class TestTransitEngineExtended:
    def test_many_rotations(self):
        te = TransitEngine()
        te.create_key("k")
        ct = te.encrypt("k", b"persistent data")
        for _ in range(10):
            te.rotate_key("k")
        pt = te.decrypt("k", ct)
        assert pt == b"persistent data"

    def test_rewrap_chain(self):
        te = TransitEngine()
        te.create_key("k")
        ct = te.encrypt("k", b"data")
        for i in range(5):
            te.rotate_key("k")
            ct = te.rewrap("k", ct)
            assert ct.key_version == i + 2
        pt = te.decrypt("k", ct)
        assert pt == b"data"

    def test_min_decryption_version_after_rotations(self):
        te = TransitEngine()
        te.create_key("k")
        ct_v1 = te.encrypt("k", b"v1_data")
        te.rotate_key("k")
        ct_v2 = te.encrypt("k", b"v2_data")
        te.rotate_key("k")
        te.update_key_config("k", min_decryption_version=2)
        with pytest.raises(EncryptionError):
            te.decrypt("k", ct_v1)
        assert te.decrypt("k", ct_v2) == b"v2_data"

    def test_context_encryption_different_contexts(self):
        te = TransitEngine()
        te.create_key("k")
        ct1 = te.encrypt("k", b"data", context=b"ctx1")
        ct2 = te.encrypt("k", b"data", context=b"ctx2")
        assert ct1.ciphertext != ct2.ciphertext
        assert te.decrypt("k", ct1, context=b"ctx1") == b"data"
        assert te.decrypt("k", ct2, context=b"ctx2") == b"data"

    def test_get_key(self):
        te = TransitEngine()
        te.create_key("k")
        tk = te.get_key("k")
        assert tk is not None
        assert tk.name == "k"
        assert te.get_key("nonexistent") is None

    def test_delete_nonexistent_key(self):
        te = TransitEngine()
        assert not te.delete_key("nonexistent")

    def test_rotate_nonexistent_key_raises(self):
        te = TransitEngine()
        with pytest.raises(VaultError):
            te.rotate_key("nonexistent")

    def test_update_nonexistent_key_raises(self):
        te = TransitEngine()
        with pytest.raises(VaultError):
            te.update_key_config("nonexistent", deletion_allowed=True)

    def test_transit_ciphertext_serialize_deserialize(self):
        te = TransitEngine()
        te.create_key("k")
        ct = te.encrypt("k", b"round trip test")
        serialized = ct.serialize()
        deserialized = TransitCiphertext.deserialize("k", serialized)
        pt = te.decrypt("k", deserialized)
        assert pt == b"round trip test"

    def test_transit_invalid_ciphertext_format(self):
        with pytest.raises(EncryptionError):
            TransitCiphertext.deserialize("k", "bad:format")

    def test_transit_invalid_signature_format(self):
        with pytest.raises(EncryptionError):
            TransitSignature.deserialize("k", "bad:format")

    def test_sign_verify_after_rotation(self):
        te = TransitEngine()
        te.create_key("hmac", TransitKeyType.HMAC_SHA256)
        sig_v1 = te.sign("hmac", b"data")
        te.rotate_key("hmac")
        assert te.verify("hmac", b"data", sig_v1)
        sig_v2 = te.sign("hmac", b"data")
        assert sig_v2.key_version == 2

    def test_batch_encrypt_empty_list(self):
        te = TransitEngine()
        te.create_key("k")
        assert te.batch_encrypt("k", []) == []

    def test_can_encrypt_version(self):
        te = TransitEngine()
        tk = te.create_key("k")
        assert tk.can_encrypt_version(1)
        assert not tk.can_encrypt_version(2)
        te.rotate_key("k")
        assert not tk.can_encrypt_version(1)

    def test_can_decrypt_version(self):
        te = TransitEngine()
        tk = te.create_key("k")
        assert tk.can_decrypt_version(1)
        tk.min_decryption_version = 2
        assert not tk.can_decrypt_version(1)
        assert tk.can_decrypt_version(2)


class TestSecretStoreEdgeCases:
    def test_put_many_versions_then_list(self):
        store = SecretStore(default_max_versions=100)
        for i in range(50):
            store.put("s", f"v{i}".encode())
        versions = store.list_versions("s")
        assert len(versions) == 50

    def test_destroy_all_then_put(self):
        store = SecretStore()
        store.put("s", b"v1")
        store.destroy("s")
        store.put("s", b"v2")
        result = store.get("s")
        assert result.value == b"v2"

    def test_list_secrets_empty_prefix(self):
        store = SecretStore()
        store.put("a", b"1")
        store.put("b", b"2")
        secrets = store.list_secrets()
        assert len(secrets) == 2

    def test_delete_nonexistent_path_raises(self):
        store = SecretStore()
        with pytest.raises(SecretNotFound):
            store.delete("nonexistent")

    def test_undelete_nonexistent_path_raises(self):
        store = SecretStore()
        with pytest.raises(SecretNotFound):
            store.undelete("nonexistent")

    def test_destroy_nonexistent_path_raises(self):
        store = SecretStore()
        with pytest.raises(SecretNotFound):
            store.destroy("nonexistent")

    def test_list_versions_nonexistent_raises(self):
        store = SecretStore()
        with pytest.raises(SecretNotFound):
            store.list_versions("nonexistent")

    def test_get_metadata_nonexistent_raises(self):
        store = SecretStore()
        with pytest.raises(SecretNotFound):
            store.get_metadata("nonexistent")

    def test_update_metadata_nonexistent_raises(self):
        store = SecretStore()
        with pytest.raises(SecretNotFound):
            store.update_metadata("nonexistent")

    def test_secret_entry_version_count(self):
        store = SecretStore()
        for i in range(5):
            store.put("s", f"v{i}".encode())
        entry = store._secrets["default/s"]
        assert entry.version_count() == 5

    def test_secret_entry_current_none_after_delete(self):
        store = SecretStore()
        store.put("s", b"v1")
        store.delete("s")
        entry = store._secrets["default/s"]
        assert entry.current is None

    def test_secret_entry_path(self):
        store = SecretStore()
        store.put("my/path", b"v")
        entry = store._secrets["default/my/path"]
        assert entry.path == "my/path"


class TestRotationPolicyDetails:
    def test_policy_in_grace_period_false(self):
        policy = RotationPolicy(
            policy_id="p1", path_pattern="*",
            rotation_interval=1000, grace_period=100,
        )
        assert not policy.in_grace_period(time.time() - 200)

    def test_set_last_rotation_time(self):
        rm = RotationManager()
        rm.set_last_rotation_time("p", 1000.0)
        assert rm.get_last_rotation_time("p") == 1000.0

    def test_no_last_rotation_time(self):
        rm = RotationManager()
        assert rm.get_last_rotation_time("nonexistent") is None

    def test_is_in_grace_period_no_last_rotation(self):
        rm = RotationManager()
        assert not rm.is_in_grace_period("nonexistent")

    def test_is_in_grace_period_with_policy_id(self):
        rm = RotationManager()
        policy = RotationPolicy(
            policy_id="p1", path_pattern="secret/*",
            rotation_interval=1000, grace_period=500,
        )
        rm.add_policy(policy)
        rm.set_last_rotation_time("secret/db", time.time() - 100)
        assert rm.is_in_grace_period("secret/db", policy_id="p1")

    def test_list_policies(self):
        rm = RotationManager()
        rm.add_policy(RotationPolicy(policy_id="p1", path_pattern="*", rotation_interval=100))
        rm.add_policy(RotationPolicy(policy_id="p2", path_pattern="*", rotation_interval=200))
        policies = rm.list_policies()
        assert len(policies) == 2

    def test_rotation_record_to_dict_complete(self):
        record = RotationRecord(
            record_id="r1", path="p", old_version=1, new_version=2,
            policy_id="pol", state=RotationState.IN_PROGRESS,
        )
        record.complete()
        d = record.to_dict()
        assert d["state"] == "completed"
        assert d["completed_at"] is not None


class TestShamirSharesExtended:
    def test_large_num_shares(self):
        secret = 999
        shares = generate_shares(secret, 5, 20)
        assert len(shares) == 20
        assert reconstruct_secret(shares[:5]) == secret
        assert reconstruct_secret(shares[10:15]) == secret

    def test_minimum_threshold(self):
        secret = 42
        shares = generate_shares(secret, 2, 10)
        assert reconstruct_secret(shares[:2]) == secret

    def test_secret_zero(self):
        shares = generate_shares(0, 2, 3)
        assert reconstruct_secret(shares[:2]) == 0

    def test_secret_one(self):
        shares = generate_shares(1, 2, 3)
        assert reconstruct_secret(shares[:2]) == 1

    def test_threshold_equals_shares(self):
        secret = 12345
        shares = generate_shares(secret, 5, 5)
        assert reconstruct_secret(shares) == secret

    def test_secret_too_large_raises(self):
        with pytest.raises(UnsealError):
            generate_shares(PRIME + 1, 2, 3)


class TestTransitKeyConfig:
    def test_min_decryption_version_invalid(self):
        te = TransitEngine()
        te.create_key("k")
        with pytest.raises(VaultError):
            te.update_key_config("k", min_decryption_version=0)

    def test_exportable_key(self):
        te = TransitEngine()
        tk = te.create_key("k", exportable=True)
        assert tk.exportable

    def test_key_type_in_to_dict(self):
        te = TransitEngine()
        tk = te.create_key("k", TransitKeyType.AES128_GCM)
        d = tk.to_dict()
        assert d["key_type"] == "aes128-gcm"

    def test_decrypt_nonexistent_key(self):
        te = TransitEngine()
        with pytest.raises(VaultError):
            te.decrypt("nonexistent", TransitCiphertext(
                key_name="nonexistent", key_version=1,
                ciphertext=b"x", nonce=b"\x00" * 12, tag=b"\x00" * 16,
            ))

    def test_verify_nonexistent_key(self):
        te = TransitEngine()
        with pytest.raises(VaultError):
            te.verify("nonexistent", b"data", TransitSignature(
                key_name="nonexistent", key_version=1,
                signature=b"\x00" * 32, algorithm="hmac-sha256",
            ))


class TestSecretVersionLifecycle:
    def test_version_checksum_computed(self):
        sv = SecretVersion(version=1, value=b"test_value")
        assert len(sv.checksum) > 0

    def test_destroyed_version_no_checksum(self):
        sv = SecretVersion(version=1, value=b"test_value")
        sv.destroy()
        assert sv.checksum == ""
        assert sv.value == b""

    def test_soft_delete_preserves_value(self):
        sv = SecretVersion(version=1, value=b"secret")
        sv.soft_delete()
        assert sv.value == b"secret"
        assert sv.state == SecretState.DELETED

    def test_restore_after_soft_delete(self):
        sv = SecretVersion(version=1, value=b"secret")
        sv.soft_delete()
        sv.restore()
        assert sv.is_active
        assert sv.deleted_at is None

    def test_version_timestamps(self):
        sv = SecretVersion(version=1, value=b"val")
        assert sv.created_at > 0
        assert sv.deleted_at is None
        assert sv.destroyed_at is None
        sv.soft_delete()
        assert sv.deleted_at is not None
        sv.restore()
        sv.destroy()
        assert sv.destroyed_at is not None
