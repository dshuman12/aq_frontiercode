"""Tests for utility modules."""
from __future__ import annotations

import time
import pytest

from vaultkey.utils.errors import (
    VaultError, CryptoError, KeyDerivationError, EncryptionError,
    HashError, AccessDenied, PolicyError, SealedError, UnsealError,
    LeaseExpired, LeaseNotFound, SecretNotFound, SecretVersionNotFound,
    TokenError, TokenExpired, TokenRevoked, AuthenticationError,
    MountError, PluginError, BackendError, TransactionError,
    AuditError, TamperDetected, RotationError, TransportError,
    HandshakeError, ProtocolError, EncodingError,
)
from vaultkey.utils.time import (
    parse_duration, format_duration, is_expired, remaining_ttl,
    ExpiryTracker, current_timestamp, monotonic_seconds,
)
from vaultkey.utils.collections import (
    TTLMap, BoundedQueue, ImmutableConfig, LRUCache, _deep_merge,
)


class TestVaultError:
    def test_basic_creation(self):
        err = VaultError("something failed")
        assert err.message == "something failed"
        assert err.code == "VAULT_ERROR"
        assert err.details == {}

    def test_with_code_and_details(self):
        err = VaultError("fail", code="CUSTOM", details={"key": "val"})
        assert err.code == "CUSTOM"
        assert err.details["key"] == "val"

    def test_to_dict(self):
        err = VaultError("msg", code="C", details={"x": 1})
        d = err.to_dict()
        assert d["error"] == "C"
        assert d["message"] == "msg"
        assert d["details"]["x"] == 1

    def test_repr(self):
        err = VaultError("msg", code="C")
        assert "VaultError" in repr(err)
        assert "C" in repr(err)

    def test_is_exception(self):
        with pytest.raises(VaultError):
            raise VaultError("test")


class TestCryptoError:
    def test_crypto_error(self):
        err = CryptoError("bad crypto")
        assert err.code == "CRYPTO_ERROR"

    def test_key_derivation_error(self):
        err = KeyDerivationError("bad kdf")
        assert err.code == "KEY_DERIVATION_ERROR"

    def test_encryption_error(self):
        err = EncryptionError("bad enc")
        assert err.code == "ENCRYPTION_ERROR"

    def test_hash_error(self):
        err = HashError("bad hash")
        assert err.code == "HASH_ERROR"

    def test_inheritance(self):
        assert issubclass(KeyDerivationError, CryptoError)
        assert issubclass(EncryptionError, CryptoError)
        assert issubclass(CryptoError, VaultError)


class TestAccessErrors:
    def test_access_denied(self):
        err = AccessDenied(path="/secret/foo")
        assert err.code == "ACCESS_DENIED"
        assert err.path == "/secret/foo"
        assert "path" in err.details

    def test_access_denied_default_message(self):
        err = AccessDenied()
        assert err.message == "access denied"

    def test_policy_error(self):
        err = PolicyError("bad policy")
        assert err.code == "POLICY_ERROR"

    def test_sealed_error(self):
        err = SealedError()
        assert err.code == "SEALED"
        assert "sealed" in err.message

    def test_unseal_error(self):
        err = UnsealError("bad share")
        assert err.code == "UNSEAL_ERROR"


class TestLeaseErrors:
    def test_lease_expired(self):
        err = LeaseExpired("lease-123")
        assert err.lease_id == "lease-123"
        assert err.code == "LEASE_EXPIRED"

    def test_lease_not_found(self):
        err = LeaseNotFound("lease-456")
        assert err.lease_id == "lease-456"


class TestSecretErrors:
    def test_secret_not_found(self):
        err = SecretNotFound("secret/db/pass")
        assert err.path == "secret/db/pass"

    def test_version_not_found(self):
        err = SecretVersionNotFound("secret/x", 5)
        assert err.path == "secret/x"
        assert err.version == 5


class TestTokenErrors:
    def test_token_error(self):
        err = TokenError("bad token")
        assert err.code == "TOKEN_ERROR"

    def test_token_expired(self):
        err = TokenExpired("tok-1")
        assert err.code == "TOKEN_EXPIRED"

    def test_token_revoked(self):
        err = TokenRevoked("tok-2")
        assert err.code == "TOKEN_REVOKED"


class TestOtherErrors:
    def test_auth_error(self):
        err = AuthenticationError()
        assert err.code == "AUTH_ERROR"

    def test_mount_error(self):
        err = MountError("bad mount")
        assert err.code == "MOUNT_ERROR"

    def test_plugin_error(self):
        err = PluginError("bad plugin")
        assert err.code == "PLUGIN_ERROR"

    def test_backend_error(self):
        err = BackendError("io fail")
        assert err.code == "BACKEND_ERROR"

    def test_transaction_error(self):
        err = TransactionError("commit fail")
        assert err.code == "TRANSACTION_ERROR"
        assert issubclass(TransactionError, BackendError)

    def test_audit_error(self):
        err = AuditError("log fail")
        assert err.code == "AUDIT_ERROR"

    def test_tamper_detected(self):
        err = TamperDetected()
        assert err.code == "TAMPER_DETECTED"

    def test_rotation_error(self):
        err = RotationError("bad rotation")
        assert err.code == "ROTATION_ERROR"

    def test_transport_error(self):
        err = TransportError("bad transport")
        assert err.code == "TRANSPORT_ERROR"

    def test_handshake_error(self):
        err = HandshakeError("bad handshake")
        assert err.code == "HANDSHAKE_ERROR"

    def test_protocol_error(self):
        err = ProtocolError("bad frame")
        assert err.code == "PROTOCOL_ERROR"

    def test_encoding_error(self):
        err = EncodingError("bad encoding")
        assert err.code == "ENCODING_ERROR"


class TestParseDuration:
    def test_seconds_only(self):
        assert parse_duration("30s") == 30.0

    def test_minutes_only(self):
        assert parse_duration("5m") == 300.0

    def test_hours_only(self):
        assert parse_duration("2h") == 7200.0

    def test_days_only(self):
        assert parse_duration("1d") == 86400.0

    def test_combined(self):
        assert parse_duration("1d2h30m10s") == 86400 + 7200 + 1800 + 10

    def test_numeric_string(self):
        assert parse_duration("120") == 120.0

    def test_empty_raises(self):
        with pytest.raises(ValueError):
            parse_duration("")

    def test_zero_raises(self):
        with pytest.raises(ValueError):
            parse_duration("0s")

    def test_whitespace(self):
        assert parse_duration("  1h  ") == 3600.0


class TestFormatDuration:
    def test_zero(self):
        assert format_duration(0) == "0s"

    def test_seconds(self):
        assert format_duration(45) == "45s"

    def test_minutes(self):
        assert format_duration(120) == "2m"

    def test_hours(self):
        assert format_duration(7200) == "2h"

    def test_days(self):
        assert format_duration(86400) == "1d"

    def test_combined(self):
        result = format_duration(90061)
        assert "1d" in result
        assert "1h" in result
        assert "1m" in result
        assert "1s" in result

    def test_negative(self):
        assert format_duration(-60) == "-1m"


class TestIsExpired:
    def test_not_expired(self):
        now = 1000.0
        assert not is_expired(900.0, 200.0, now=now)

    def test_expired(self):
        now = 1000.0
        assert is_expired(900.0, 50.0, now=now)

    def test_zero_ttl_never_expires(self):
        assert not is_expired(0.0, 0.0, now=99999.0)
        assert not is_expired(0.0, -1.0, now=99999.0)

    def test_exact_boundary(self):
        assert is_expired(0.0, 100.0, now=100.0)


class TestRemainingTTL:
    def test_has_remaining(self):
        r = remaining_ttl(100.0, 200.0, now=150.0)
        assert r == 150.0

    def test_expired_returns_zero(self):
        r = remaining_ttl(100.0, 50.0, now=200.0)
        assert r == 0.0

    def test_zero_ttl_returns_inf(self):
        r = remaining_ttl(100.0, 0.0, now=200.0)
        assert r == float("inf")


class TestExpiryTracker:
    def test_add_and_check(self):
        clock_val = [100.0]
        tracker = ExpiryTracker(_clock=lambda: clock_val[0])
        tracker.add("item1", 60.0)
        assert not tracker.is_expired("item1")
        clock_val[0] = 200.0
        assert tracker.is_expired("item1")

    def test_remaining(self):
        clock_val = [100.0]
        tracker = ExpiryTracker(_clock=lambda: clock_val[0])
        tracker.add("item1", 60.0)
        assert tracker.remaining("item1") == 60.0
        clock_val[0] = 130.0
        assert tracker.remaining("item1") == 30.0

    def test_remove(self):
        tracker = ExpiryTracker()
        tracker.add("x", 10.0)
        assert tracker.remove("x")
        assert not tracker.remove("x")

    def test_expired_items(self):
        clock_val = [100.0]
        tracker = ExpiryTracker(_clock=lambda: clock_val[0])
        tracker.add("a", 10.0)
        tracker.add("b", 200.0)
        clock_val[0] = 120.0
        expired = tracker.expired_items()
        assert "a" in expired
        assert "b" not in expired

    def test_renew(self):
        clock_val = [100.0]
        tracker = ExpiryTracker(_clock=lambda: clock_val[0])
        tracker.add("x", 10.0)
        clock_val[0] = 108.0
        assert tracker.renew("x", 20.0)
        assert tracker.remaining("x") == 20.0

    def test_missing_item_expired(self):
        tracker = ExpiryTracker()
        assert tracker.is_expired("nonexistent")

    def test_count_and_clear(self):
        tracker = ExpiryTracker()
        tracker.add("a", 10.0)
        tracker.add("b", 10.0)
        assert tracker.count() == 2
        tracker.clear()
        assert tracker.count() == 0


class TestTTLMap:
    def test_put_and_get(self):
        m: TTLMap[str] = TTLMap(default_ttl=300.0)
        m.put("key", "value")
        assert m.get("key") == "value"

    def test_expiry(self):
        clock_val = [0.0]
        m: TTLMap[str] = TTLMap(default_ttl=10.0, clock=lambda: clock_val[0])
        m.put("k", "v")
        assert m.get("k") == "v"
        clock_val[0] = 11.0
        assert m.get("k") is None

    def test_custom_ttl(self):
        clock_val = [0.0]
        m: TTLMap[str] = TTLMap(default_ttl=100.0, clock=lambda: clock_val[0])
        m.put("k", "v", ttl=5.0)
        clock_val[0] = 6.0
        assert m.get("k") is None

    def test_delete(self):
        m: TTLMap[str] = TTLMap()
        m.put("k", "v")
        assert m.delete("k")
        assert not m.delete("k")

    def test_contains(self):
        m: TTLMap[str] = TTLMap()
        m.put("k", "v")
        assert m.contains("k")
        assert not m.contains("missing")

    def test_keys_values_items(self):
        m: TTLMap[str] = TTLMap()
        m.put("a", "1")
        m.put("b", "2")
        assert set(m.keys()) == {"a", "b"}
        assert set(m.values()) == {"1", "2"}
        assert len(m.items()) == 2

    def test_size_and_clear(self):
        m: TTLMap[str] = TTLMap()
        m.put("a", "1")
        m.put("b", "2")
        assert m.size() == 2
        m.clear()
        assert m.size() == 0

    def test_cleanup(self):
        clock_val = [0.0]
        m: TTLMap[str] = TTLMap(default_ttl=5.0, clock=lambda: clock_val[0])
        m.put("a", "1")
        m.put("b", "2")
        clock_val[0] = 10.0
        removed = m.cleanup()
        assert removed == 2

    def test_touch(self):
        clock_val = [0.0]
        m: TTLMap[str] = TTLMap(default_ttl=10.0, clock=lambda: clock_val[0])
        m.put("k", "v")
        clock_val[0] = 8.0
        assert m.touch("k")
        clock_val[0] = 15.0
        assert m.get("k") == "v"
        clock_val[0] = 20.0
        assert m.get("k") is None

    def test_default_value(self):
        m: TTLMap[str] = TTLMap()
        assert m.get("missing", "default") == "default"


class TestBoundedQueue:
    def test_push_and_pop(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=5)
        q.push(1)
        q.push(2)
        assert q.pop() == 1
        assert q.pop() == 2

    def test_overflow(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=2)
        q.push(1)
        q.push(2)
        evicted = q.push(3)
        assert evicted == 1
        assert q.pop() == 2

    def test_peek(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=5)
        q.push(10)
        q.push(20)
        assert q.peek() == 10
        assert q.peek_newest() == 20

    def test_drain(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=5)
        q.push(1)
        q.push(2)
        items = q.drain()
        assert items == [1, 2]
        assert q.is_empty()

    def test_size_and_full(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=2)
        assert q.size() == 0
        q.push(1)
        q.push(2)
        assert q.is_full()

    def test_to_list(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=5)
        q.push(1)
        q.push(2)
        assert q.to_list() == [1, 2]

    def test_clear(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=5)
        q.push(1)
        q.clear()
        assert q.is_empty()

    def test_invalid_size(self):
        with pytest.raises(ValueError):
            BoundedQueue(max_size=0)

    def test_pop_empty(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=5)
        assert q.pop() is None

    def test_max_size_property(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=42)
        assert q.max_size == 42


class TestImmutableConfig:
    def test_get(self):
        cfg = ImmutableConfig(_data={"key": "val"})
        assert cfg.get("key") == "val"

    def test_nested_get(self):
        cfg = ImmutableConfig(_data={"a": {"b": {"c": 42}}})
        assert cfg.get("a.b.c") == 42

    def test_default(self):
        cfg = ImmutableConfig(_data={})
        assert cfg.get("missing", "default") == "default"

    def test_merge(self):
        cfg = ImmutableConfig(_data={"a": 1, "b": 2})
        merged = cfg.merge({"b": 3, "c": 4})
        assert merged.get("a") == 1
        assert merged.get("b") == 3
        assert merged.get("c") == 4

    def test_to_dict(self):
        cfg = ImmutableConfig(_data={"x": 1})
        assert cfg.to_dict() == {"x": 1}

    def test_contains(self):
        cfg = ImmutableConfig(_data={"x": 1})
        assert cfg.contains("x")
        assert not cfg.contains("y")

    def test_keys_values_items(self):
        cfg = ImmutableConfig(_data={"a": 1, "b": 2})
        assert set(cfg.keys()) == {"a", "b"}
        assert set(cfg.values()) == {1, 2}
        assert len(cfg.items()) == 2

    def test_len(self):
        cfg = ImmutableConfig(_data={"a": 1})
        assert len(cfg) == 1

    def test_equality(self):
        c1 = ImmutableConfig(_data={"a": 1})
        c2 = ImmutableConfig(_data={"a": 1})
        assert c1 == c2

    def test_deep_merge(self):
        cfg = ImmutableConfig(_data={"a": {"x": 1, "y": 2}})
        merged = cfg.merge({"a": {"y": 3, "z": 4}})
        assert merged.get("a.x") == 1
        assert merged.get("a.y") == 3
        assert merged.get("a.z") == 4


class TestLRUCache:
    def test_put_get(self):
        cache: LRUCache[int] = LRUCache(max_size=5)
        cache.put("a", 1)
        assert cache.get("a") == 1

    def test_eviction(self):
        cache: LRUCache[int] = LRUCache(max_size=2)
        cache.put("a", 1)
        cache.put("b", 2)
        evicted = cache.put("c", 3)
        assert evicted == "a"
        assert cache.get("a") is None

    def test_access_refreshes(self):
        cache: LRUCache[int] = LRUCache(max_size=2)
        cache.put("a", 1)
        cache.put("b", 2)
        cache.get("a")
        cache.put("c", 3)
        assert cache.get("a") == 1
        assert cache.get("b") is None

    def test_delete(self):
        cache: LRUCache[int] = LRUCache(max_size=5)
        cache.put("a", 1)
        assert cache.delete("a")
        assert not cache.delete("a")

    def test_contains(self):
        cache: LRUCache[int] = LRUCache(max_size=5)
        cache.put("a", 1)
        assert cache.contains("a")
        assert not cache.contains("b")

    def test_size_and_clear(self):
        cache: LRUCache[int] = LRUCache(max_size=5)
        cache.put("a", 1)
        cache.put("b", 2)
        assert cache.size() == 2
        cache.clear()
        assert cache.size() == 0

    def test_keys(self):
        cache: LRUCache[int] = LRUCache(max_size=5)
        cache.put("a", 1)
        cache.put("b", 2)
        assert set(cache.keys()) == {"a", "b"}

    def test_invalid_size(self):
        with pytest.raises(ValueError):
            LRUCache(max_size=0)

    def test_update_existing(self):
        cache: LRUCache[int] = LRUCache(max_size=5)
        cache.put("a", 1)
        evicted = cache.put("a", 2)
        assert evicted is None
        assert cache.get("a") == 2


class TestDeepMerge:
    def test_simple(self):
        result = _deep_merge({"a": 1}, {"b": 2})
        assert result == {"a": 1, "b": 2}

    def test_override(self):
        result = _deep_merge({"a": 1}, {"a": 2})
        assert result == {"a": 2}

    def test_nested(self):
        result = _deep_merge({"a": {"x": 1}}, {"a": {"y": 2}})
        assert result == {"a": {"x": 1, "y": 2}}


# ---------------------------------------------------------------------------
# EXPANDED TESTS — appended below existing tests
# ---------------------------------------------------------------------------


class TestTTLMapThreadSafety:
    def test_concurrent_put_get(self):
        import threading
        m: TTLMap[int] = TTLMap(default_ttl=300.0)
        errors: list[str] = []

        def writer(start: int):
            for i in range(50):
                m.put(f"key-{start}-{i}", start * 100 + i)

        def reader(start: int):
            for i in range(50):
                val = m.get(f"key-{start}-{i}")

        threads = []
        for t_id in range(4):
            threads.append(threading.Thread(target=writer, args=(t_id,)))
            threads.append(threading.Thread(target=reader, args=(t_id,)))
        for t in threads:
            t.start()
        for t in threads:
            t.join()

    def test_many_expirations(self):
        clock_val = [0.0]
        m: TTLMap[str] = TTLMap(default_ttl=1.0, clock=lambda: clock_val[0])
        for i in range(100):
            m.put(f"k{i}", f"v{i}")
        assert m.size() == 100
        clock_val[0] = 2.0
        removed = m.cleanup()
        assert removed == 100
        assert m.size() == 0

    def test_mixed_ttls(self):
        clock_val = [0.0]
        m: TTLMap[str] = TTLMap(default_ttl=10.0, clock=lambda: clock_val[0])
        m.put("short", "a", ttl=1.0)
        m.put("long", "b", ttl=100.0)
        clock_val[0] = 5.0
        assert m.get("short") is None
        assert m.get("long") == "b"

    def test_touch_nonexistent(self):
        m: TTLMap[str] = TTLMap()
        assert not m.touch("nonexistent")

    def test_zero_ttl_never_expires(self):
        clock_val = [0.0]
        m: TTLMap[str] = TTLMap(default_ttl=0.0, clock=lambda: clock_val[0])
        m.put("k", "v")
        clock_val[0] = 999999.0
        assert m.get("k") == "v"


class TestBoundedQueueOverflow:
    def test_continuous_overflow(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=3)
        evicted_items: list[int] = []
        for i in range(10):
            evicted = q.push(i)
            if evicted is not None:
                evicted_items.append(evicted)
        assert len(evicted_items) == 7
        assert q.size() == 3
        assert q.to_list() == [7, 8, 9]

    def test_push_pop_interleaved(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=5)
        q.push(1)
        q.push(2)
        assert q.pop() == 1
        q.push(3)
        q.push(4)
        assert q.pop() == 2
        assert q.to_list() == [3, 4]

    def test_peek_empty(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=5)
        assert q.peek() is None
        assert q.peek_newest() is None

    def test_drain_returns_all(self):
        q: BoundedQueue[str] = BoundedQueue(max_size=10)
        for i in range(5):
            q.push(f"item-{i}")
        items = q.drain()
        assert len(items) == 5
        assert q.is_empty()

    def test_size_1_queue(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=1)
        q.push(1)
        assert q.is_full()
        evicted = q.push(2)
        assert evicted == 1
        assert q.pop() == 2


class TestLRUCacheUpdatePatterns:
    def test_lru_eviction_order(self):
        cache: LRUCache[int] = LRUCache(max_size=3)
        cache.put("a", 1)
        cache.put("b", 2)
        cache.put("c", 3)
        cache.get("a")
        evicted = cache.put("d", 4)
        assert evicted == "b"
        assert cache.get("a") == 1
        assert cache.get("b") is None

    def test_update_moves_to_end(self):
        cache: LRUCache[int] = LRUCache(max_size=3)
        cache.put("a", 1)
        cache.put("b", 2)
        cache.put("c", 3)
        cache.put("a", 10)
        evicted = cache.put("d", 4)
        assert evicted == "b"
        assert cache.get("a") == 10

    def test_cache_size_1(self):
        cache: LRUCache[int] = LRUCache(max_size=1)
        cache.put("a", 1)
        evicted = cache.put("b", 2)
        assert evicted == "a"
        assert cache.get("a") is None
        assert cache.get("b") == 2

    def test_many_operations(self):
        cache: LRUCache[int] = LRUCache(max_size=10)
        for i in range(100):
            cache.put(f"k{i}", i)
        assert cache.size() == 10
        for i in range(90):
            assert cache.get(f"k{i}") is None
        for i in range(90, 100):
            assert cache.get(f"k{i}") == i

    def test_delete_and_reinsert(self):
        cache: LRUCache[int] = LRUCache(max_size=5)
        cache.put("a", 1)
        cache.delete("a")
        assert cache.get("a") is None
        cache.put("a", 2)
        assert cache.get("a") == 2


class TestImmutableConfigDeepNesting:
    def test_three_level_nesting(self):
        cfg = ImmutableConfig(_data={"a": {"b": {"c": {"d": 42}}}})
        assert cfg.get("a.b.c.d") == 42

    def test_missing_deep_key(self):
        cfg = ImmutableConfig(_data={"a": {"b": 1}})
        assert cfg.get("a.b.c.d", "default") == "default"

    def test_deep_merge_three_levels(self):
        cfg = ImmutableConfig(_data={"a": {"b": {"x": 1}}})
        merged = cfg.merge({"a": {"b": {"y": 2}}})
        assert merged.get("a.b.x") == 1
        assert merged.get("a.b.y") == 2

    def test_merge_replaces_non_dict(self):
        cfg = ImmutableConfig(_data={"a": 1})
        merged = cfg.merge({"a": {"b": 2}})
        assert merged.get("a.b") == 2

    def test_merge_preserves_other_keys(self):
        cfg = ImmutableConfig(_data={"a": 1, "b": 2, "c": 3})
        merged = cfg.merge({"b": 20})
        assert merged.get("a") == 1
        assert merged.get("b") == 20
        assert merged.get("c") == 3

    def test_equality_different(self):
        c1 = ImmutableConfig(_data={"a": 1})
        c2 = ImmutableConfig(_data={"a": 2})
        assert c1 != c2

    def test_equality_with_non_config(self):
        c = ImmutableConfig(_data={"a": 1})
        assert c != {"a": 1}

    def test_empty_config(self):
        cfg = ImmutableConfig(_data={})
        assert len(cfg) == 0
        assert cfg.keys() == []
        assert cfg.get("anything") is None


class TestTimeUtilitiesEdgeCases:
    def test_parse_duration_hours_and_seconds(self):
        assert parse_duration("2h30s") == 7230.0

    def test_parse_duration_days_and_minutes(self):
        assert parse_duration("1d30m") == 88200.0

    def test_format_roundtrip(self):
        for seconds in [1, 60, 3600, 86400, 90061]:
            formatted = format_duration(seconds)
            parsed = parse_duration(formatted)
            assert parsed == float(seconds)

    def test_is_expired_negative_ttl(self):
        assert not is_expired(0.0, -1.0, now=99999.0)

    def test_remaining_ttl_negative_ttl(self):
        assert remaining_ttl(0.0, -1.0) == float("inf")

    def test_monotonic_functions_return_numbers(self):
        from vaultkey.utils.time import monotonic_ns, monotonic_seconds
        assert isinstance(monotonic_ns(), int)
        assert isinstance(monotonic_seconds(), float)

    def test_current_timestamp(self):
        from vaultkey.utils.time import current_timestamp
        ts = current_timestamp()
        assert ts > 0

    def test_expiry_tracker_renew_nonexistent(self):
        tracker = ExpiryTracker()
        assert not tracker.renew("nonexistent", 10.0)

    def test_expiry_tracker_remaining_nonexistent(self):
        tracker = ExpiryTracker()
        assert tracker.remaining("nonexistent") == 0.0

    def test_parse_duration_case_insensitive(self):
        assert parse_duration("1H") == 3600.0
        assert parse_duration("1D") == 86400.0

    def test_parse_duration_invalid(self):
        with pytest.raises(ValueError):
            parse_duration("abc")


class TestErrorHierarchy:
    def test_all_errors_are_vault_errors(self):
        error_classes = [
            CryptoError, KeyDerivationError, EncryptionError, HashError,
            AccessDenied, PolicyError, SealedError, UnsealError,
            TokenError, TokenExpired, TokenRevoked, AuthenticationError,
            MountError, PluginError, BackendError, TransactionError,
            AuditError, TamperDetected, RotationError, TransportError,
            HandshakeError, ProtocolError, EncodingError,
        ]
        for cls in error_classes:
            assert issubclass(cls, VaultError)

    def test_transport_error_hierarchy(self):
        assert issubclass(HandshakeError, TransportError)
        assert issubclass(ProtocolError, TransportError)
        assert issubclass(TransportError, VaultError)

    def test_backend_error_hierarchy(self):
        assert issubclass(TransactionError, BackendError)
        assert issubclass(BackendError, VaultError)

    def test_audit_error_hierarchy(self):
        assert issubclass(TamperDetected, AuditError)
        assert issubclass(AuditError, VaultError)

    def test_token_error_hierarchy(self):
        assert issubclass(TokenExpired, TokenError)
        assert issubclass(TokenRevoked, TokenError)
        assert issubclass(TokenError, VaultError)

    def test_error_to_dict_structure(self):
        err = VaultError("msg", code="CODE", details={"k": "v"})
        d = err.to_dict()
        assert set(d.keys()) == {"error", "message", "details"}

    def test_lease_expired_has_lease_id(self):
        err = LeaseExpired("l-123")
        assert err.lease_id == "l-123"
        assert "l-123" in err.details["lease_id"]

    def test_secret_version_not_found_fields(self):
        err = SecretVersionNotFound("path/x", 5)
        assert err.path == "path/x"
        assert err.version == 5
        assert err.details["version"] == 5


class TestDeepMergeExtended:
    def test_deep_nested_merge(self):
        base = {"a": {"b": {"c": {"d": 1, "e": 2}}}}
        override = {"a": {"b": {"c": {"e": 3, "f": 4}}}}
        result = _deep_merge(base, override)
        assert result["a"]["b"]["c"]["d"] == 1
        assert result["a"]["b"]["c"]["e"] == 3
        assert result["a"]["b"]["c"]["f"] == 4

    def test_merge_empty_base(self):
        result = _deep_merge({}, {"a": 1})
        assert result == {"a": 1}

    def test_merge_empty_override(self):
        result = _deep_merge({"a": 1}, {})
        assert result == {"a": 1}

    def test_merge_non_dict_override(self):
        result = _deep_merge({"a": {"b": 1}}, {"a": 2})
        assert result == {"a": 2}


class TestTTLMapAdvanced:
    def test_overwrite_value(self):
        m: TTLMap[str] = TTLMap()
        m.put("k", "v1")
        m.put("k", "v2")
        assert m.get("k") == "v2"

    def test_items_excludes_expired(self):
        clock_val = [0.0]
        m: TTLMap[str] = TTLMap(default_ttl=5.0, clock=lambda: clock_val[0])
        m.put("a", "1")
        m.put("b", "2", ttl=1.0)
        clock_val[0] = 3.0
        items = m.items()
        assert len(items) == 1
        assert items[0][0] == "a"

    def test_values_excludes_expired(self):
        clock_val = [0.0]
        m: TTLMap[str] = TTLMap(default_ttl=5.0, clock=lambda: clock_val[0])
        m.put("a", "1")
        m.put("b", "2", ttl=1.0)
        clock_val[0] = 3.0
        vals = m.values()
        assert vals == ["1"]

    def test_keys_excludes_expired(self):
        clock_val = [0.0]
        m: TTLMap[str] = TTLMap(default_ttl=5.0, clock=lambda: clock_val[0])
        m.put("a", "1")
        m.put("b", "2", ttl=1.0)
        clock_val[0] = 3.0
        keys = m.keys()
        assert keys == ["a"]


class TestBoundedQueueAdvanced:
    def test_peek_after_overflow(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=3)
        for i in range(5):
            q.push(i)
        assert q.peek() == 2
        assert q.peek_newest() == 4

    def test_to_list_after_drain(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=5)
        q.push(1)
        q.drain()
        assert q.to_list() == []

    def test_size_after_pop(self):
        q: BoundedQueue[int] = BoundedQueue(max_size=5)
        q.push(1)
        q.push(2)
        q.pop()
        assert q.size() == 1


class TestLRUCacheAdvanced:
    def test_get_nonexistent(self):
        cache: LRUCache[int] = LRUCache(max_size=5)
        assert cache.get("missing") is None

    def test_sequential_evictions(self):
        cache: LRUCache[int] = LRUCache(max_size=3)
        cache.put("a", 1)
        cache.put("b", 2)
        cache.put("c", 3)
        assert cache.put("d", 4) == "a"
        assert cache.put("e", 5) == "b"
        assert cache.put("f", 6) == "c"
        assert cache.size() == 3

    def test_contains_after_eviction(self):
        cache: LRUCache[int] = LRUCache(max_size=2)
        cache.put("a", 1)
        cache.put("b", 2)
        cache.put("c", 3)
        assert not cache.contains("a")
        assert cache.contains("b")
        assert cache.contains("c")


class TestExpiryTrackerAdvanced:
    def test_multiple_items(self):
        clock_val = [100.0]
        tracker = ExpiryTracker(_clock=lambda: clock_val[0])
        tracker.add("a", 10.0)
        tracker.add("b", 20.0)
        tracker.add("c", 30.0)
        clock_val[0] = 115.0
        expired = tracker.expired_items()
        assert "a" in expired
        assert "b" not in expired
        assert "c" not in expired

    def test_renew_resets_timer(self):
        clock_val = [100.0]
        tracker = ExpiryTracker(_clock=lambda: clock_val[0])
        tracker.add("x", 10.0)
        clock_val[0] = 108.0
        tracker.renew("x", 20.0)
        clock_val[0] = 125.0
        assert not tracker.is_expired("x")
        clock_val[0] = 130.0
        assert tracker.is_expired("x")

    def test_remove_and_check(self):
        tracker = ExpiryTracker()
        tracker.add("x", 100.0)
        tracker.remove("x")
        assert tracker.is_expired("x")
        assert tracker.remaining("x") == 0.0


class TestFormatDurationAdvanced:
    def test_large_duration(self):
        result = format_duration(365 * 86400 + 12 * 3600 + 30 * 60 + 15)
        assert "365d" in result
        assert "12h" in result
        assert "30m" in result
        assert "15s" in result

    def test_exact_values(self):
        assert format_duration(86400) == "1d"
        assert format_duration(3600) == "1h"
        assert format_duration(60) == "1m"
        assert format_duration(1) == "1s"

    def test_negative_complex(self):
        result = format_duration(-3661)
        assert result.startswith("-")
        assert "1h" in result


class TestImmutableConfigOperations:
    def test_get_non_dict_intermediate(self):
        cfg = ImmutableConfig(_data={"a": "string_value"})
        assert cfg.get("a.b", "default") == "default"

    def test_merge_creates_new(self):
        cfg1 = ImmutableConfig(_data={"a": 1})
        cfg2 = cfg1.merge({"b": 2})
        assert cfg1.get("b") is None
        assert cfg2.get("b") == 2

    def test_contains_nested(self):
        cfg = ImmutableConfig(_data={"a": {"b": 1}})
        assert cfg.contains("a.b")
        assert not cfg.contains("a.c")


class TestMonotonicFunctions:
    def test_monotonic_ns_increases(self):
        from vaultkey.utils.time import monotonic_ns
        t1 = monotonic_ns()
        t2 = monotonic_ns()
        assert t2 >= t1

    def test_monotonic_seconds_increases(self):
        from vaultkey.utils.time import monotonic_seconds
        t1 = monotonic_seconds()
        t2 = monotonic_seconds()
        assert t2 >= t1

    def test_current_timestamp_positive(self):
        from vaultkey.utils.time import current_timestamp
        assert current_timestamp() > 0

    def test_is_expired_at_exact_boundary(self):
        assert is_expired(0.0, 100.0, now=100.0)
        assert not is_expired(0.0, 100.0, now=99.9)

    def test_remaining_ttl_at_boundary(self):
        r = remaining_ttl(0.0, 100.0, now=100.0)
        assert r == 0.0

    def test_parse_duration_minutes_and_seconds(self):
        assert parse_duration("5m30s") == 330.0

    def test_format_duration_hours_minutes(self):
        assert format_duration(3660) == "1h1m"

    def test_expiry_tracker_count(self):
        tracker = ExpiryTracker()
        for i in range(10):
            tracker.add(f"item-{i}", 100.0)
        assert tracker.count() == 10

    def test_expiry_tracker_clear(self):
        tracker = ExpiryTracker()
        tracker.add("a", 10.0)
        tracker.add("b", 20.0)
        tracker.clear()
        assert tracker.count() == 0

    def test_deep_merge_both_empty(self):
        result = _deep_merge({}, {})
        assert result == {}

    def test_ttl_map_overwrite_resets_ttl(self):
        clock_val = [0.0]
        m: TTLMap[str] = TTLMap(default_ttl=10.0, clock=lambda: clock_val[0])
        m.put("k", "v1")
        clock_val[0] = 8.0
        m.put("k", "v2")
        clock_val[0] = 15.0
        assert m.get("k") == "v2"
