"""Tests for cryptographic operations."""
from __future__ import annotations

import pytest

from vaultkey.crypto.random import (
    secure_random_bytes, secure_random_int, generate_token, generate_hex_token,
    generate_id, generate_salt, generate_iv, generate_nonce, secure_shuffle,
    secure_choice, secure_sample, generate_key_pair_seed, random_percentage,
    generate_uuid_v4, constant_time_compare,
)
from vaultkey.crypto.hashing import (
    hash_digest, hash_hex, hash_size, compute_hmac, verify_hmac,
    multi_hash, HashChain, MerkleTree, iterated_hash, hash_to_int,
    fingerprint, HashAlgorithm,
)
from vaultkey.crypto.kdf import (
    KeyDerivation, KDFParams, KDFAlgorithm, DerivedKey,
    DEFAULT_PBKDF2_PARAMS, DEFAULT_SCRYPT_PARAMS, DEFAULT_ARGON2_PARAMS,
    hkdf_extract, hkdf_expand, KeyStretcher, KeyDerivationCache,
)
from vaultkey.crypto.symmetric import (
    pkcs7_pad, pkcs7_unpad, encrypt_ctr, decrypt_ctr, encrypt_cbc, decrypt_cbc,
    encrypt_gcm, decrypt_gcm, SymmetricCipher, CipherMode, generate_key,
    KeyBundle, CTRCiphertext, CBCCiphertext, GCMCiphertext,
    BLOCK_SIZE, NONCE_SIZE, TAG_SIZE,
)
from vaultkey.crypto.envelope import (
    MasterKey, KeyHierarchy, EnvelopeEncryption, EnvelopeResult,
    WrappedKey, VersionedKeyRing, KeyVersion,
)
from vaultkey.utils.errors import CryptoError, EncryptionError, KeyDerivationError, HashError


class TestSecureRandomBytes:
    def test_correct_length(self):
        assert len(secure_random_bytes(32)) == 32
        assert len(secure_random_bytes(16)) == 16
        assert len(secure_random_bytes(1)) == 1

    def test_zero_length(self):
        assert secure_random_bytes(0) == b""

    def test_negative_raises(self):
        with pytest.raises(ValueError):
            secure_random_bytes(-1)

    def test_uniqueness(self):
        a = secure_random_bytes(32)
        b = secure_random_bytes(32)
        assert a != b


class TestSecureRandomInt:
    def test_in_range(self):
        for _ in range(100):
            val = secure_random_int(1, 10)
            assert 1 <= val <= 10

    def test_single_value(self):
        assert secure_random_int(5, 5) == 5

    def test_invalid_range(self):
        with pytest.raises(ValueError):
            secure_random_int(10, 1)


class TestGenerateToken:
    def test_length(self):
        token = generate_token(16)
        assert len(token) > 0

    def test_uniqueness(self):
        tokens = {generate_token() for _ in range(100)}
        assert len(tokens) == 100

    def test_invalid_length(self):
        with pytest.raises(ValueError):
            generate_token(0)


class TestGenerateHexToken:
    def test_length(self):
        token = generate_hex_token(16)
        assert len(token) == 16
        int(token, 16)

    def test_invalid_length(self):
        with pytest.raises(ValueError):
            generate_hex_token(0)


class TestGenerateId:
    def test_with_prefix(self):
        id_ = generate_id("test", 8)
        assert id_.startswith("test_")
        assert len(id_) == 5 + 8

    def test_without_prefix(self):
        id_ = generate_id("", 8)
        assert len(id_) == 8

    def test_invalid_length(self):
        with pytest.raises(ValueError):
            generate_id("", 0)


class TestGenerateSaltIVNonce:
    def test_salt(self):
        assert len(generate_salt(32)) == 32

    def test_iv(self):
        assert len(generate_iv(16)) == 16

    def test_nonce(self):
        assert len(generate_nonce(12)) == 12


class TestSecureShuffle:
    def test_same_elements(self):
        items = list(range(10))
        shuffled = secure_shuffle(items)
        assert sorted(shuffled) == list(range(10))

    def test_does_not_modify_original(self):
        items = [1, 2, 3]
        secure_shuffle(items)
        assert items == [1, 2, 3]

    def test_empty(self):
        assert secure_shuffle([]) == []


class TestSecureChoice:
    def test_valid(self):
        items = [1, 2, 3, 4, 5]
        assert secure_choice(items) in items

    def test_empty_raises(self):
        with pytest.raises(ValueError):
            secure_choice([])


class TestSecureSample:
    def test_correct_count(self):
        result = secure_sample(range(10), 3)
        assert len(result) == 3
        assert len(set(result)) == 3

    def test_too_large(self):
        with pytest.raises(ValueError):
            secure_sample([1, 2], 3)

    def test_negative(self):
        with pytest.raises(ValueError):
            secure_sample([1, 2], -1)


class TestGenerateKeyPairSeed:
    def test_returns_pair(self):
        priv, pub = generate_key_pair_seed()
        assert len(priv) == 32
        assert len(pub) == 32
        assert priv != pub


class TestRandomPercentage:
    def test_in_range(self):
        for _ in range(100):
            val = random_percentage()
            assert 0.0 <= val <= 1.0


class TestGenerateUUID:
    def test_format(self):
        uuid = generate_uuid_v4()
        parts = uuid.split("-")
        assert len(parts) == 5
        assert len(parts[0]) == 8

    def test_version_bits(self):
        uuid = generate_uuid_v4()
        assert uuid[14] == "4"


class TestConstantTimeCompare:
    def test_equal(self):
        assert constant_time_compare(b"hello", b"hello")

    def test_unequal(self):
        assert not constant_time_compare(b"hello", b"world")

    def test_different_length(self):
        assert not constant_time_compare(b"hi", b"hello")


class TestHashDigest:
    def test_sha256(self):
        h = hash_digest(b"hello", HashAlgorithm.SHA256)
        assert len(h) == 32

    def test_sha512(self):
        h = hash_digest(b"hello", HashAlgorithm.SHA512)
        assert len(h) == 64

    def test_blake2b(self):
        h = hash_digest(b"hello", HashAlgorithm.BLAKE2B)
        assert len(h) == 64

    def test_blake2s(self):
        h = hash_digest(b"hello", HashAlgorithm.BLAKE2S)
        assert len(h) == 32

    def test_deterministic(self):
        a = hash_digest(b"test", HashAlgorithm.SHA256)
        b = hash_digest(b"test", HashAlgorithm.SHA256)
        assert a == b

    def test_different_data(self):
        a = hash_digest(b"hello", HashAlgorithm.SHA256)
        b = hash_digest(b"world", HashAlgorithm.SHA256)
        assert a != b


class TestHashHex:
    def test_returns_hex(self):
        h = hash_hex(b"hello")
        assert len(h) == 64
        int(h, 16)


class TestHashSize:
    def test_sha256_size(self):
        assert hash_size(HashAlgorithm.SHA256) == 32

    def test_sha512_size(self):
        assert hash_size(HashAlgorithm.SHA512) == 64


class TestHMAC:
    def test_compute(self):
        mac = compute_hmac(b"key", b"data")
        assert len(mac) == 32

    def test_verify(self):
        mac = compute_hmac(b"key", b"data")
        assert verify_hmac(b"key", b"data", mac)

    def test_verify_fails(self):
        mac = compute_hmac(b"key", b"data")
        assert not verify_hmac(b"key", b"other", mac)

    def test_empty_key_raises(self):
        with pytest.raises(HashError):
            compute_hmac(b"", b"data")


class TestMultiHash:
    def test_default(self):
        result = multi_hash(b"test")
        assert "sha256" in result
        assert "sha512" in result

    def test_custom(self):
        result = multi_hash(b"test", [HashAlgorithm.BLAKE2B])
        assert "blake2b" in result


class TestHashChain:
    def test_append_and_verify(self):
        chain = HashChain()
        chain.append(b"entry1")
        chain.append(b"entry2")
        chain.append(b"entry3")
        assert chain.verify()

    def test_entry_linking(self):
        chain = HashChain()
        e1 = chain.append(b"first")
        e2 = chain.append(b"second")
        assert e2.previous_hash == e1.hash
        assert e1.previous_hash == b""

    def test_verify_entry(self):
        chain = HashChain()
        chain.append(b"a")
        chain.append(b"b")
        assert chain.verify_entry(0)
        assert chain.verify_entry(1)
        assert not chain.verify_entry(5)

    def test_get_entry(self):
        chain = HashChain()
        e = chain.append(b"test")
        assert chain.get_entry(0) == e
        assert chain.get_entry(99) is None

    def test_last_hash(self):
        chain = HashChain()
        e = chain.append(b"test")
        assert chain.last_hash == e.hash

    def test_len(self):
        chain = HashChain()
        chain.append(b"a")
        chain.append(b"b")
        assert len(chain) == 2

    def test_empty_chain_verifies(self):
        chain = HashChain()
        assert chain.verify()


class TestMerkleTree:
    def test_basic(self):
        tree = MerkleTree([b"a", b"b", b"c", b"d"])
        assert tree.root is not None
        assert tree.leaf_count == 4

    def test_verify_tree(self):
        tree = MerkleTree([b"a", b"b", b"c", b"d"])
        assert tree.verify_tree()

    def test_proof_and_verify(self):
        tree = MerkleTree([b"a", b"b", b"c", b"d"])
        proof = tree.get_proof(0)
        assert tree.verify_proof(b"a", 0, proof)

    def test_proof_wrong_data(self):
        tree = MerkleTree([b"a", b"b", b"c", b"d"])
        proof = tree.get_proof(0)
        assert not tree.verify_proof(b"wrong", 0, proof)

    def test_single_leaf(self):
        tree = MerkleTree([b"single"])
        assert tree.leaf_count == 1
        assert tree.root is not None

    def test_odd_leaves(self):
        tree = MerkleTree([b"a", b"b", b"c"])
        assert tree.verify_tree()

    def test_root_hex(self):
        tree = MerkleTree([b"a", b"b"])
        assert len(tree.root_hex) > 0

    def test_height(self):
        tree = MerkleTree([b"a", b"b", b"c", b"d"])
        assert tree.height >= 2

    def test_invalid_leaf_index(self):
        tree = MerkleTree([b"a", b"b"])
        with pytest.raises(HashError):
            tree.get_proof(5)

    def test_empty_raises(self):
        with pytest.raises(HashError):
            MerkleTree([])


class TestIteratedHash:
    def test_basic(self):
        result = iterated_hash(b"test", 5)
        assert len(result) == 32

    def test_zero_iterations_raises(self):
        with pytest.raises(HashError):
            iterated_hash(b"test", 0)

    def test_deterministic(self):
        a = iterated_hash(b"test", 10)
        b = iterated_hash(b"test", 10)
        assert a == b


class TestHashToInt:
    def test_returns_int(self):
        result = hash_to_int(b"test")
        assert isinstance(result, int)
        assert result > 0


class TestFingerprint:
    def test_basic(self):
        fp = fingerprint(b"test")
        assert len(fp) == 16

    def test_custom_length(self):
        fp = fingerprint(b"test", length=4)
        assert len(fp) == 8


class TestKDF:
    def test_pbkdf2_sha256(self):
        kdf = KeyDerivation()
        result = kdf.derive(b"password")
        assert len(result.key) == 32
        assert len(result.salt) == 32

    def test_pbkdf2_sha512(self):
        params = KDFParams(algorithm=KDFAlgorithm.PBKDF2_SHA512)
        kdf = KeyDerivation(params)
        result = kdf.derive(b"password")
        assert len(result.key) == 32

    def test_scrypt_like(self):
        kdf = KeyDerivation(DEFAULT_SCRYPT_PARAMS)
        result = kdf.derive(b"password")
        assert len(result.key) == 32

    def test_argon2_like(self):
        kdf = KeyDerivation(DEFAULT_ARGON2_PARAMS)
        result = kdf.derive(b"password")
        assert len(result.key) == 32

    def test_hkdf(self):
        params = KDFParams(algorithm=KDFAlgorithm.HKDF_SHA256, key_length=32)
        kdf = KeyDerivation(params)
        result = kdf.derive(b"input_key_material")
        assert len(result.key) == 32

    def test_verify(self):
        kdf = KeyDerivation()
        derived = kdf.derive(b"password")
        assert kdf.verify(b"password", derived)
        assert not kdf.verify(b"wrong", derived)

    def test_custom_salt(self):
        kdf = KeyDerivation()
        salt = b"a" * 32
        result = kdf.derive(b"password", salt=salt)
        assert result.salt == salt

    def test_empty_password_raises(self):
        kdf = KeyDerivation()
        with pytest.raises(KeyDerivationError):
            kdf.derive(b"")

    def test_short_salt_raises(self):
        kdf = KeyDerivation()
        with pytest.raises(KeyDerivationError):
            kdf.derive(b"password", salt=b"short")

    def test_deterministic(self):
        kdf = KeyDerivation()
        salt = b"fixed_salt" + b"\x00" * 22
        r1 = kdf.derive(b"password", salt=salt)
        r2 = kdf.derive(b"password", salt=salt)
        assert r1.key == r2.key

    def test_derived_key_to_dict(self):
        kdf = KeyDerivation()
        result = kdf.derive(b"password")
        d = result.to_dict()
        assert "key_hex" in d
        assert "salt_hex" in d

    def test_params_to_dict(self):
        d = DEFAULT_PBKDF2_PARAMS.to_dict()
        assert d["algorithm"] == "pbkdf2-sha256"

    def test_invalid_params(self):
        with pytest.raises(KeyDerivationError):
            params = KDFParams(algorithm=KDFAlgorithm.PBKDF2_SHA256, iterations=0)
            KeyDerivation(params)


class TestHKDF:
    def test_extract(self):
        prk = hkdf_extract(b"salt" * 8, b"ikm")
        assert len(prk) == 32

    def test_expand(self):
        prk = b"a" * 32
        okm = hkdf_expand(prk, b"info", 64)
        assert len(okm) == 64

    def test_extract_empty_salt(self):
        prk = hkdf_extract(b"", b"ikm")
        assert len(prk) == 32


class TestKeyStretcher:
    def test_stretch(self):
        stretcher = KeyStretcher(b"base_key", rounds=5)
        result = stretcher.stretch()
        assert len(result) == 32

    def test_result_property(self):
        stretcher = KeyStretcher(b"base_key", rounds=5)
        assert stretcher.result == stretcher.result

    def test_derive_subkey(self):
        stretcher = KeyStretcher(b"base_key", rounds=5)
        sub = stretcher.derive_subkey(b"context", 16)
        assert len(sub) == 16

    def test_empty_key_raises(self):
        with pytest.raises(KeyDerivationError):
            KeyStretcher(b"", rounds=5)

    def test_zero_rounds_raises(self):
        with pytest.raises(KeyDerivationError):
            KeyStretcher(b"key", rounds=0)


class TestKeyDerivationCache:
    def test_put_get(self):
        cache = KeyDerivationCache()
        kdf = KeyDerivation()
        derived = kdf.derive(b"password")
        cache.put("key1", derived)
        assert cache.get("key1") is derived

    def test_miss(self):
        cache = KeyDerivationCache()
        assert cache.get("missing") is None

    def test_invalidate(self):
        cache = KeyDerivationCache()
        kdf = KeyDerivation()
        derived = kdf.derive(b"password")
        cache.put("k", derived)
        assert cache.invalidate("k")
        assert not cache.invalidate("k")

    def test_overflow(self):
        cache = KeyDerivationCache(_max_size=2)
        kdf = KeyDerivation()
        for i in range(3):
            cache.put(f"key{i}", kdf.derive(b"pw"))
        assert cache.size() == 2

    def test_make_key(self):
        key = KeyDerivationCache.make_key("abc123", "salt_hex", "sha256")
        assert "sha256" in key


class TestPKCS7:
    def test_pad_unpad(self):
        data = b"hello"
        padded = pkcs7_pad(data)
        assert len(padded) % BLOCK_SIZE == 0
        assert pkcs7_unpad(padded) == data

    def test_block_aligned(self):
        data = b"a" * BLOCK_SIZE
        padded = pkcs7_pad(data)
        assert len(padded) == 2 * BLOCK_SIZE

    def test_unpad_empty_raises(self):
        with pytest.raises(EncryptionError):
            pkcs7_unpad(b"")

    def test_invalid_padding(self):
        with pytest.raises(EncryptionError):
            pkcs7_unpad(b"\x00" * 16)


class TestCTRMode:
    def test_encrypt_decrypt(self):
        key = generate_key(32)
        ct = encrypt_ctr(b"hello world", key)
        pt = decrypt_ctr(ct, key)
        assert pt == b"hello world"

    def test_with_nonce(self):
        key = generate_key(32)
        nonce = b"\x00" * NONCE_SIZE
        ct = encrypt_ctr(b"test", key, nonce=nonce)
        assert ct.nonce == nonce

    def test_to_from_bytes(self):
        key = generate_key(32)
        ct = encrypt_ctr(b"test", key)
        raw = ct.to_bytes()
        restored = CTRCiphertext.from_bytes(raw)
        assert decrypt_ctr(restored, key) == b"test"

    def test_wrong_key_fails(self):
        key1 = generate_key(32)
        key2 = generate_key(32)
        ct = encrypt_ctr(b"hello", key1)
        result = decrypt_ctr(ct, key2)
        assert result != b"hello"

    def test_empty_plaintext(self):
        key = generate_key(32)
        ct = encrypt_ctr(b"", key)
        pt = decrypt_ctr(ct, key)
        assert pt == b""


class TestCBCMode:
    def test_encrypt_decrypt(self):
        key = generate_key(32)
        ct = encrypt_cbc(b"hello world!!!!!", key)
        pt = decrypt_cbc(ct, key)
        assert pt == b"hello world!!!!!"

    def test_with_iv(self):
        key = generate_key(32)
        iv = b"\x00" * BLOCK_SIZE
        ct = encrypt_cbc(b"test data here!!", key, iv=iv)
        assert ct.iv == iv

    def test_to_from_bytes(self):
        key = generate_key(32)
        ct = encrypt_cbc(b"test data here!!", key)
        raw = ct.to_bytes()
        restored = CBCCiphertext.from_bytes(raw)
        assert decrypt_cbc(restored, key) == b"test data here!!"


class TestGCMMode:
    def test_encrypt_decrypt(self):
        key = generate_key(32)
        ct = encrypt_gcm(b"hello world", key)
        pt = decrypt_gcm(ct, key)
        assert pt == b"hello world"

    def test_with_aad(self):
        key = generate_key(32)
        ct = encrypt_gcm(b"data", key, aad=b"additional")
        pt = decrypt_gcm(ct, key)
        assert pt == b"data"

    def test_tampered_ciphertext(self):
        key = generate_key(32)
        ct = encrypt_gcm(b"data", key)
        tampered = GCMCiphertext(
            ciphertext=b"\xff" + ct.ciphertext[1:],
            nonce=ct.nonce,
            tag=ct.tag,
        )
        with pytest.raises(EncryptionError, match="authentication failed"):
            decrypt_gcm(tampered, key)

    def test_tampered_tag(self):
        key = generate_key(32)
        ct = encrypt_gcm(b"data", key)
        tampered = GCMCiphertext(
            ciphertext=ct.ciphertext,
            nonce=ct.nonce,
            tag=b"\x00" * TAG_SIZE,
        )
        with pytest.raises(EncryptionError):
            decrypt_gcm(tampered, key)

    def test_to_from_bytes(self):
        key = generate_key(32)
        ct = encrypt_gcm(b"test", key)
        raw = ct.to_bytes()
        restored = GCMCiphertext.from_bytes(raw)
        assert decrypt_gcm(restored, key) == b"test"


class TestSymmetricCipher:
    def test_gcm_mode(self):
        key = generate_key(32)
        cipher = SymmetricCipher(key, CipherMode.GCM)
        ct = cipher.encrypt(b"secret")
        pt = cipher.decrypt(ct)
        assert pt == b"secret"

    def test_ctr_mode(self):
        key = generate_key(32)
        cipher = SymmetricCipher(key, CipherMode.CTR)
        ct = cipher.encrypt(b"secret")
        pt = cipher.decrypt(ct)
        assert pt == b"secret"

    def test_cbc_mode(self):
        key = generate_key(32)
        cipher = SymmetricCipher(key, CipherMode.CBC)
        ct = cipher.encrypt(b"sixteen bytes!!")
        pt = cipher.decrypt(ct)
        assert pt == b"sixteen bytes!!"

    def test_gcm_with_aad(self):
        key = generate_key(32)
        cipher = SymmetricCipher(key, CipherMode.GCM)
        ct = cipher.encrypt(b"data", aad=b"header")
        pt = cipher.decrypt(ct, aad=b"header")
        assert pt == b"data"

    def test_invalid_key_size(self):
        with pytest.raises(EncryptionError):
            SymmetricCipher(b"short")

    def test_mode_property(self):
        key = generate_key(32)
        cipher = SymmetricCipher(key, CipherMode.CTR)
        assert cipher.mode == CipherMode.CTR


class TestGenerateKey:
    def test_valid_sizes(self):
        assert len(generate_key(16)) == 16
        assert len(generate_key(24)) == 24
        assert len(generate_key(32)) == 32

    def test_invalid_size(self):
        with pytest.raises(EncryptionError):
            generate_key(10)


class TestKeyBundle:
    def test_generate(self):
        bundle = KeyBundle.generate("key-1")
        assert len(bundle.encryption_key) == 32
        assert len(bundle.signing_key) == 32
        assert bundle.key_id == "key-1"

    def test_rotate(self):
        bundle = KeyBundle.generate("key-1")
        rotated = bundle.rotate("key-2")
        assert rotated.key_id == "key-2"
        assert rotated.metadata["previous_key_id"] == "key-1"
        assert rotated.encryption_key != bundle.encryption_key


class TestMasterKey:
    def test_generate(self):
        mk = MasterKey.generate("mk-1")
        assert mk.key_id == "mk-1"
        assert len(mk.key_material) == 32

    def test_auto_id(self):
        mk = MasterKey.generate()
        assert mk.key_id.startswith("mk_")

    def test_derive_wrapping_key(self):
        mk = MasterKey.generate()
        wk = mk.derive_wrapping_key()
        assert len(wk) == 32


class TestKeyHierarchy:
    def test_add_master_key(self):
        h = KeyHierarchy()
        mk = MasterKey.generate("mk1")
        h.add_master_key(mk)
        assert h.active_master_key == mk

    def test_generate_data_key(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate())
        dk, wrapped = h.generate_data_key()
        assert len(dk) == 32
        assert wrapped.master_key_id == h.active_master_key.key_id

    def test_wrap_unwrap(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate())
        raw_key = generate_key(32)
        wrapped = h.wrap_key(raw_key)
        unwrapped = h.unwrap_key(wrapped)
        assert unwrapped == raw_key

    def test_rewrap(self):
        h = KeyHierarchy()
        mk1 = MasterKey.generate("mk1")
        mk2 = MasterKey.generate("mk2")
        h.add_master_key(mk1)
        raw_key = generate_key(32)
        wrapped = h.wrap_key(raw_key)
        h.add_master_key(mk2)
        rewrapped = h.rewrap_key(wrapped)
        assert rewrapped.master_key_id == "mk2"
        unwrapped = h.unwrap_key(rewrapped)
        assert unwrapped == raw_key

    def test_rotate_master_key(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate())
        new_mk = h.rotate_master_key()
        assert h.active_master_key == new_mk
        assert h.master_key_count == 2

    def test_invalidate_cache(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate())
        dk, wrapped = h.generate_data_key()
        h.invalidate_cache()
        unwrapped = h.unwrap_key(wrapped)
        assert unwrapped == dk

    def test_no_active_key_raises(self):
        h = KeyHierarchy()
        with pytest.raises(CryptoError):
            h.generate_data_key()


class TestEnvelopeEncryption:
    def test_encrypt_decrypt(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate())
        ee = EnvelopeEncryption(h)
        result = ee.encrypt(b"secret data")
        plaintext = ee.decrypt(result)
        assert plaintext == b"secret data"

    def test_with_aad(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate())
        ee = EnvelopeEncryption(h)
        result = ee.encrypt(b"secret", aad=b"context")
        plaintext = ee.decrypt(result)
        assert plaintext == b"secret"

    def test_reencrypt(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate("mk1"))
        ee = EnvelopeEncryption(h)
        result = ee.encrypt(b"data")
        h.rotate_master_key()
        reencrypted = ee.reencrypt(result)
        plaintext = ee.decrypt(reencrypted)
        assert plaintext == b"data"


class TestVersionedKeyRing:
    def test_add_version(self):
        ring = VersionedKeyRing("test-ring")
        kv = ring.add_version(b"key1")
        assert kv.version == 1
        assert ring.current_version == 1

    def test_multiple_versions(self):
        ring = VersionedKeyRing("test-ring")
        ring.add_version(b"key1")
        ring.add_version(b"key2")
        assert ring.current_version == 2
        assert ring.version_count == 2

    def test_get_version(self):
        ring = VersionedKeyRing("test-ring")
        ring.add_version(b"key1")
        kv = ring.get_version(1)
        assert kv is not None
        assert kv.key_material == b"key1"

    def test_retire_version(self):
        ring = VersionedKeyRing("test-ring")
        ring.add_version(b"key1")
        assert ring.retire_version(1)
        assert len(ring.active_versions()) == 0

    def test_all_versions(self):
        ring = VersionedKeyRing("test-ring")
        ring.add_version(b"a")
        ring.add_version(b"b")
        assert len(ring.all_versions()) == 2


# ---------------------------------------------------------------------------
# EXPANDED TESTS — appended below existing tests
# ---------------------------------------------------------------------------


class TestCTRModeEdgeCases:
    def test_large_data_roundtrip(self):
        key = generate_key(32)
        data = b"A" * 10000
        ct = encrypt_ctr(data, key)
        assert decrypt_ctr(ct, key) == data

    def test_single_byte(self):
        key = generate_key(32)
        ct = encrypt_ctr(b"\xff", key)
        assert decrypt_ctr(ct, key) == b"\xff"

    def test_block_boundary_data(self):
        key = generate_key(32)
        for length in [15, 16, 17, 31, 32, 33, 48, 64]:
            data = b"X" * length
            ct = encrypt_ctr(data, key)
            assert decrypt_ctr(ct, key) == data

    def test_key_size_16(self):
        key = generate_key(16)
        ct = encrypt_ctr(b"test 16-byte key", key)
        assert decrypt_ctr(ct, key) == b"test 16-byte key"

    def test_key_size_24(self):
        key = generate_key(24)
        ct = encrypt_ctr(b"test 24-byte key", key)
        assert decrypt_ctr(ct, key) == b"test 24-byte key"

    def test_invalid_key_size(self):
        with pytest.raises(EncryptionError):
            encrypt_ctr(b"data", b"short")

    def test_invalid_nonce_size(self):
        key = generate_key(32)
        with pytest.raises(EncryptionError):
            encrypt_ctr(b"data", key, nonce=b"\x00" * 8)

    def test_ctr_from_bytes_too_short(self):
        with pytest.raises(EncryptionError):
            CTRCiphertext.from_bytes(b"\x00" * 5)

    def test_different_nonces_different_ciphertext(self):
        key = generate_key(32)
        ct1 = encrypt_ctr(b"same data", key, nonce=b"\x00" * NONCE_SIZE)
        ct2 = encrypt_ctr(b"same data", key, nonce=b"\x01" * NONCE_SIZE)
        assert ct1.ciphertext != ct2.ciphertext

    def test_ctr_to_bytes_length(self):
        key = generate_key(32)
        ct = encrypt_ctr(b"hello", key)
        raw = ct.to_bytes()
        assert len(raw) == NONCE_SIZE + len(b"hello")


class TestCBCModeEdgeCases:
    def test_large_data_roundtrip(self):
        key = generate_key(32)
        data = b"B" * 10000
        ct = encrypt_cbc(data, key)
        assert decrypt_cbc(ct, key) == data

    def test_empty_data(self):
        key = generate_key(32)
        ct = encrypt_cbc(b"", key)
        assert decrypt_cbc(ct, key) == b""

    def test_key_size_16(self):
        key = generate_key(16)
        ct = encrypt_cbc(b"cbc with 16-byte key", key)
        assert decrypt_cbc(ct, key) == b"cbc with 16-byte key"

    def test_key_size_24(self):
        key = generate_key(24)
        ct = encrypt_cbc(b"cbc with 24-byte key", key)
        assert decrypt_cbc(ct, key) == b"cbc with 24-byte key"

    def test_invalid_key_size(self):
        with pytest.raises(EncryptionError):
            encrypt_cbc(b"data", b"bad_key")

    def test_invalid_iv_size(self):
        key = generate_key(32)
        with pytest.raises(EncryptionError):
            encrypt_cbc(b"data", key, iv=b"\x00" * 8)

    def test_cbc_from_bytes_too_short(self):
        with pytest.raises(EncryptionError):
            CBCCiphertext.from_bytes(b"\x00" * 5)

    def test_invalid_ciphertext_length(self):
        key = generate_key(32)
        ct = CBCCiphertext(ciphertext=b"\x00" * 17, iv=b"\x00" * BLOCK_SIZE)
        with pytest.raises(EncryptionError):
            decrypt_cbc(ct, key)

    def test_block_aligned_data(self):
        key = generate_key(32)
        for num_blocks in [1, 2, 3, 5, 10]:
            data = b"X" * (BLOCK_SIZE * num_blocks)
            ct = encrypt_cbc(data, key)
            assert decrypt_cbc(ct, key) == data


class TestGCMModeEdgeCases:
    def test_large_data_roundtrip(self):
        key = generate_key(32)
        data = b"G" * 10000
        ct = encrypt_gcm(data, key)
        assert decrypt_gcm(ct, key) == data

    def test_empty_data(self):
        key = generate_key(32)
        ct = encrypt_gcm(b"", key)
        assert decrypt_gcm(ct, key) == b""

    def test_key_size_16(self):
        key = generate_key(16)
        ct = encrypt_gcm(b"gcm 16-byte key", key)
        assert decrypt_gcm(ct, key) == b"gcm 16-byte key"

    def test_key_size_24(self):
        key = generate_key(24)
        ct = encrypt_gcm(b"gcm 24-byte key", key)
        assert decrypt_gcm(ct, key) == b"gcm 24-byte key"

    def test_invalid_key_size(self):
        with pytest.raises(EncryptionError):
            encrypt_gcm(b"data", b"bad")

    def test_invalid_nonce_size(self):
        key = generate_key(32)
        with pytest.raises(EncryptionError):
            encrypt_gcm(b"data", key, nonce=b"\x00" * 8)

    def test_gcm_from_bytes_too_short(self):
        with pytest.raises(EncryptionError):
            GCMCiphertext.from_bytes(b"\x00" * 10)

    def test_aad_mismatch_fails(self):
        key = generate_key(32)
        ct = encrypt_gcm(b"data", key, aad=b"correct_aad")
        tampered = GCMCiphertext(
            ciphertext=ct.ciphertext, nonce=ct.nonce, tag=ct.tag, aad=b"wrong_aad",
        )
        with pytest.raises(EncryptionError):
            decrypt_gcm(tampered, key)

    def test_large_aad(self):
        key = generate_key(32)
        aad = b"X" * 5000
        ct = encrypt_gcm(b"data", key, aad=aad)
        assert decrypt_gcm(ct, key) == b"data"

    def test_single_byte_data(self):
        key = generate_key(32)
        ct = encrypt_gcm(b"\x42", key)
        assert decrypt_gcm(ct, key) == b"\x42"

    def test_gcm_to_bytes_roundtrip_with_aad(self):
        key = generate_key(32)
        ct = encrypt_gcm(b"test", key, aad=b"aad")
        raw = ct.to_bytes()
        restored = GCMCiphertext.from_bytes(raw, aad=b"aad")
        assert decrypt_gcm(restored, key) == b"test"


class TestHashChainCorruption:
    def test_tampered_data_detected(self):
        chain = HashChain()
        chain.append(b"entry1")
        chain.append(b"entry2")
        chain._entries[1] = type(chain._entries[1])(
            index=1, data=b"TAMPERED", hash=chain._entries[1].hash,
            previous_hash=chain._entries[1].previous_hash,
        )
        assert not chain.verify()

    def test_tampered_hash_detected(self):
        chain = HashChain()
        chain.append(b"entry1")
        chain.append(b"entry2")
        chain._entries[0] = type(chain._entries[0])(
            index=0, data=chain._entries[0].data, hash=b"\x00" * 32,
            previous_hash=chain._entries[0].previous_hash,
        )
        assert not chain.verify()

    def test_broken_link_detected(self):
        chain = HashChain()
        chain.append(b"entry1")
        chain.append(b"entry2")
        chain._entries[1] = type(chain._entries[1])(
            index=1, data=chain._entries[1].data, hash=chain._entries[1].hash,
            previous_hash=b"\xff" * 32,
        )
        assert not chain.verify()

    def test_single_entry_chain(self):
        chain = HashChain()
        chain.append(b"only")
        assert chain.verify()
        assert chain.verify_entry(0)

    def test_chain_with_different_algorithm(self):
        chain = HashChain(algorithm=HashAlgorithm.SHA512)
        chain.append(b"a")
        chain.append(b"b")
        assert chain.verify()

    def test_verify_entry_negative_index(self):
        chain = HashChain()
        chain.append(b"x")
        assert not chain.verify_entry(-1)

    def test_long_chain_integrity(self):
        chain = HashChain()
        for i in range(50):
            chain.append(f"entry-{i}".encode())
        assert chain.verify()
        assert len(chain) == 50


class TestMerkleTreeExtended:
    def test_power_of_2_leaves(self):
        for n in [2, 4, 8, 16]:
            leaves = [f"leaf-{i}".encode() for i in range(n)]
            tree = MerkleTree(leaves)
            assert tree.verify_tree()
            assert tree.leaf_count == n

    def test_non_power_of_2_leaves(self):
        for n in [3, 5, 7, 9, 13]:
            leaves = [f"leaf-{i}".encode() for i in range(n)]
            tree = MerkleTree(leaves)
            assert tree.verify_tree()

    def test_proof_for_all_leaves(self):
        leaves = [f"leaf-{i}".encode() for i in range(8)]
        tree = MerkleTree(leaves)
        for i in range(8):
            proof = tree.get_proof(i)
            assert tree.verify_proof(leaves[i], i, proof)

    def test_proof_for_all_odd_count(self):
        leaves = [f"leaf-{i}".encode() for i in range(7)]
        tree = MerkleTree(leaves)
        for i in range(7):
            proof = tree.get_proof(i)
            assert tree.verify_proof(leaves[i], i, proof)

    def test_different_algorithm(self):
        leaves = [b"a", b"b", b"c"]
        tree = MerkleTree(leaves, algorithm=HashAlgorithm.SHA512)
        assert tree.verify_tree()

    def test_two_leaves(self):
        tree = MerkleTree([b"x", b"y"])
        assert tree.verify_tree()
        assert tree.height == 2

    def test_negative_leaf_index(self):
        tree = MerkleTree([b"a", b"b"])
        with pytest.raises(HashError):
            tree.get_proof(-1)

    def test_large_tree(self):
        leaves = [f"leaf-{i}".encode() for i in range(100)]
        tree = MerkleTree(leaves)
        assert tree.verify_tree()
        proof = tree.get_proof(50)
        assert tree.verify_proof(leaves[50], 50, proof)

    def test_identical_leaves(self):
        tree = MerkleTree([b"same"] * 4)
        assert tree.verify_tree()

    def test_root_changes_with_data(self):
        tree1 = MerkleTree([b"a", b"b"])
        tree2 = MerkleTree([b"a", b"c"])
        assert tree1.root != tree2.root


class TestKDFExtended:
    def test_pbkdf2_different_key_lengths(self):
        for key_len in [16, 32, 64]:
            params = KDFParams(algorithm=KDFAlgorithm.PBKDF2_SHA256, key_length=key_len)
            kdf = KeyDerivation(params)
            result = kdf.derive(b"password")
            assert len(result.key) == key_len

    def test_hkdf_different_key_lengths(self):
        for key_len in [16, 32, 48]:
            params = KDFParams(algorithm=KDFAlgorithm.HKDF_SHA256, key_length=key_len)
            kdf = KeyDerivation(params)
            result = kdf.derive(b"input")
            assert len(result.key) == key_len

    def test_pbkdf2_sha512_deterministic(self):
        params = KDFParams(algorithm=KDFAlgorithm.PBKDF2_SHA512)
        kdf = KeyDerivation(params)
        salt = b"fixed_salt" + b"\x00" * 22
        r1 = kdf.derive(b"password", salt=salt)
        r2 = kdf.derive(b"password", salt=salt)
        assert r1.key == r2.key

    def test_scrypt_like_deterministic(self):
        kdf = KeyDerivation(DEFAULT_SCRYPT_PARAMS)
        salt = b"deterministic_salt" + b"\x00" * 14
        r1 = kdf.derive(b"password", salt=salt)
        r2 = kdf.derive(b"password", salt=salt)
        assert r1.key == r2.key

    def test_argon2_like_deterministic(self):
        kdf = KeyDerivation(DEFAULT_ARGON2_PARAMS)
        salt = b"argon2_salt_fixed" + b"\x00" * 15
        r1 = kdf.derive(b"password", salt=salt)
        r2 = kdf.derive(b"password", salt=salt)
        assert r1.key == r2.key

    def test_different_passwords_different_keys(self):
        kdf = KeyDerivation()
        salt = b"shared_salt" + b"\x00" * 21
        r1 = kdf.derive(b"password1", salt=salt)
        r2 = kdf.derive(b"password2", salt=salt)
        assert r1.key != r2.key

    def test_params_validate_salt_too_short(self):
        with pytest.raises(KeyDerivationError):
            params = KDFParams(algorithm=KDFAlgorithm.PBKDF2_SHA256, salt_length=4)
            KeyDerivation(params)

    def test_params_validate_key_too_short(self):
        with pytest.raises(KeyDerivationError):
            params = KDFParams(algorithm=KDFAlgorithm.PBKDF2_SHA256, key_length=8)
            KeyDerivation(params)

    def test_params_validate_low_parallelism(self):
        with pytest.raises(KeyDerivationError):
            params = KDFParams(algorithm=KDFAlgorithm.ARGON2_LIKE, parallelism=0)
            KeyDerivation(params)

    def test_params_validate_low_memory_cost(self):
        with pytest.raises(KeyDerivationError):
            params = KDFParams(algorithm=KDFAlgorithm.ARGON2_LIKE, memory_cost=512)
            KeyDerivation(params)

    def test_hkdf_extract_with_empty_salt(self):
        prk = hkdf_extract(b"", b"input_key")
        assert len(prk) == 32

    def test_hkdf_expand_various_lengths(self):
        prk = b"\xab" * 32
        for length in [16, 32, 48, 64, 128]:
            okm = hkdf_expand(prk, b"info", length)
            assert len(okm) == length


class TestEnvelopeEncryptionExtended:
    def test_multiple_rotations(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate("mk1"))
        ee = EnvelopeEncryption(h)
        result = ee.encrypt(b"data")
        for i in range(5):
            h.rotate_master_key()
            result = ee.reencrypt(result)
        assert ee.decrypt(result) == b"data"

    def test_wrap_unwrap_various_key_sizes(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate())
        for size in [16, 24, 32]:
            raw_key = generate_key(size)
            wrapped = h.wrap_key(raw_key)
            unwrapped = h.unwrap_key(wrapped)
            assert unwrapped == raw_key

    def test_rewrap_preserves_plaintext(self):
        h = KeyHierarchy()
        mk1 = MasterKey.generate("mk1")
        mk2 = MasterKey.generate("mk2")
        h.add_master_key(mk1)
        raw = generate_key(32)
        wrapped1 = h.wrap_key(raw)
        h.add_master_key(mk2)
        wrapped2 = h.rewrap_key(wrapped1)
        assert h.unwrap_key(wrapped2) == raw

    def test_wrapped_key_to_dict(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate())
        raw = generate_key(32)
        wrapped = h.wrap_key(raw)
        d = wrapped.to_dict()
        assert "encrypted_key" in d
        assert "master_key_id" in d

    def test_envelope_result_to_dict(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate())
        ee = EnvelopeEncryption(h)
        result = ee.encrypt(b"data")
        d = result.to_dict()
        assert "ciphertext" in d
        assert "wrapped_key" in d

    def test_master_key_different_sizes(self):
        for size in [16, 32]:
            mk = MasterKey.generate(key_size=size)
            assert len(mk.key_material) == size

    def test_hierarchy_list_keys(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate("mk1"))
        h.add_master_key(MasterKey.generate("mk2"))
        assert len(h.list_master_keys()) == 2

    def test_hierarchy_list_data_keys(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate())
        h.generate_data_key()
        h.generate_data_key()
        assert len(h.list_data_keys()) == 2

    def test_invalidate_specific_cache(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate())
        dk, wrapped = h.generate_data_key()
        h.invalidate_cache(wrapped.key_id)
        unwrapped = h.unwrap_key(wrapped)
        assert unwrapped == dk

    def test_no_master_key_wrap_raises(self):
        h = KeyHierarchy()
        with pytest.raises(CryptoError):
            h.wrap_key(generate_key(32))


class TestKeyBundleExtended:
    def test_generate_with_16_byte_keys(self):
        bundle = KeyBundle.generate("small", key_size=16)
        assert len(bundle.encryption_key) == 16
        assert len(bundle.signing_key) == 16

    def test_rotate_chain(self):
        b1 = KeyBundle.generate("k1")
        b2 = b1.rotate("k2")
        b3 = b2.rotate("k3")
        assert b3.metadata["previous_key_id"] == "k2"
        assert b3.key_id == "k3"

    def test_metadata_preserved_on_create(self):
        bundle = KeyBundle.generate("k1")
        assert bundle.metadata == {}
        bundle.metadata["custom"] = "value"
        rotated = bundle.rotate("k2")
        assert rotated.metadata["previous_key_id"] == "k1"

    def test_created_at_set(self):
        import time
        before = time.time()
        bundle = KeyBundle.generate("k1")
        after = time.time()
        assert before <= bundle.created_at <= after


class TestSymmetricCipherExtended:
    def test_decrypt_too_short(self):
        key = generate_key(32)
        cipher = SymmetricCipher(key)
        with pytest.raises(EncryptionError):
            cipher.decrypt(b"\x00")

    def test_decrypt_unknown_mode_byte(self):
        key = generate_key(32)
        cipher = SymmetricCipher(key)
        with pytest.raises(EncryptionError):
            cipher.decrypt(b"\xff" + b"\x00" * 50)

    def test_cross_mode_encrypt_decrypt(self):
        key = generate_key(32)
        data = b"cross mode test data"
        for mode in CipherMode:
            cipher = SymmetricCipher(key, mode)
            ct = cipher.encrypt(data)
            assert ct[0] in (0x01, 0x02, 0x03)
            pt = cipher.decrypt(ct)
            assert pt == data

    def test_gcm_aad_roundtrip_via_cipher(self):
        key = generate_key(32)
        cipher = SymmetricCipher(key, CipherMode.GCM)
        aad = b"associated data"
        ct = cipher.encrypt(b"payload", aad=aad)
        pt = cipher.decrypt(ct, aad=aad)
        assert pt == b"payload"

    def test_large_data_all_modes(self):
        key = generate_key(32)
        data = b"L" * 5000
        for mode in CipherMode:
            cipher = SymmetricCipher(key, mode)
            ct = cipher.encrypt(data)
            assert cipher.decrypt(ct) == data


class TestVersionedKeyRingExtended:
    def test_retire_nonexistent_version(self):
        ring = VersionedKeyRing("ring")
        assert not ring.retire_version(99)

    def test_current_property(self):
        ring = VersionedKeyRing("ring")
        assert ring.current is None
        ring.add_version(b"key1")
        assert ring.current is not None
        assert ring.current.key_material == b"key1"

    def test_many_versions(self):
        ring = VersionedKeyRing("ring")
        for i in range(20):
            ring.add_version(f"key-{i}".encode())
        assert ring.version_count == 20
        assert ring.current_version == 20

    def test_active_versions_excludes_retired(self):
        ring = VersionedKeyRing("ring")
        ring.add_version(b"a")
        ring.add_version(b"b")
        ring.add_version(b"c")
        ring.retire_version(2)
        active = ring.active_versions()
        assert len(active) == 2

    def test_key_version_is_retired(self):
        ring = VersionedKeyRing("ring")
        kv = ring.add_version(b"key")
        assert not kv.is_retired
        ring.retire_version(1)
        assert kv.is_retired


class TestPKCS7Extended:
    def test_various_data_lengths(self):
        for length in range(0, 50):
            data = b"X" * length
            padded = pkcs7_pad(data)
            assert len(padded) % BLOCK_SIZE == 0
            assert pkcs7_unpad(padded) == data

    def test_invalid_block_size_zero(self):
        with pytest.raises(EncryptionError):
            pkcs7_pad(b"data", block_size=0)

    def test_invalid_block_size_too_large(self):
        with pytest.raises(EncryptionError):
            pkcs7_pad(b"data", block_size=256)

    def test_unpad_not_block_aligned(self):
        with pytest.raises(EncryptionError):
            pkcs7_unpad(b"\x01\x02\x03")

    def test_unpad_bad_pad_value(self):
        data = b"\x00" * 15 + b"\x11"
        with pytest.raises(EncryptionError):
            pkcs7_unpad(data)


class TestKeyStretcherExtended:
    def test_deterministic(self):
        s1 = KeyStretcher(b"same_key", rounds=3)
        s2 = KeyStretcher(b"same_key", rounds=3)
        assert s1.stretch() == s2.stretch()

    def test_different_keys_different_result(self):
        s1 = KeyStretcher(b"key_a", rounds=3)
        s2 = KeyStretcher(b"key_b", rounds=3)
        assert s1.stretch() != s2.stretch()

    def test_derive_subkey_different_contexts(self):
        s = KeyStretcher(b"base", rounds=3)
        sk1 = s.derive_subkey(b"context_1", 32)
        sk2 = s.derive_subkey(b"context_2", 32)
        assert sk1 != sk2

    def test_derive_subkey_various_lengths(self):
        s = KeyStretcher(b"key", rounds=3)
        for length in [16, 32, 48, 64]:
            sk = s.derive_subkey(b"ctx", length)
            assert len(sk) == length

    def test_many_rounds(self):
        s = KeyStretcher(b"key", rounds=100)
        result = s.stretch()
        assert len(result) == 32


class TestKeyDerivationCacheExtended:
    def test_clear(self):
        cache = KeyDerivationCache()
        kdf = KeyDerivation()
        cache.put("k1", kdf.derive(b"pw"))
        cache.clear()
        assert cache.size() == 0

    def test_eviction_order(self):
        cache = KeyDerivationCache(_max_size=3)
        kdf = KeyDerivation()
        for i in range(5):
            cache.put(f"key{i}", kdf.derive(b"pw"))
        assert cache.size() == 3
        assert cache.get("key0") is None
        assert cache.get("key1") is None
        assert cache.get("key2") is not None

    def test_make_key_format(self):
        key = KeyDerivationCache.make_key("phash", "shex", "algo")
        parts = key.split(":")
        assert len(parts) == 3


class TestHashFunctionsExtended:
    def test_sha384(self):
        h = hash_digest(b"hello", HashAlgorithm.SHA384)
        assert len(h) == 48

    def test_hash_size_all_algorithms(self):
        assert hash_size(HashAlgorithm.SHA256) == 32
        assert hash_size(HashAlgorithm.SHA384) == 48
        assert hash_size(HashAlgorithm.SHA512) == 64
        assert hash_size(HashAlgorithm.BLAKE2B) == 64
        assert hash_size(HashAlgorithm.BLAKE2S) == 32

    def test_multi_hash_custom_set(self):
        result = multi_hash(b"data", [HashAlgorithm.SHA256, HashAlgorithm.SHA384, HashAlgorithm.BLAKE2S])
        assert len(result) == 3
        assert "sha384" in result

    def test_hmac_with_sha384(self):
        mac = compute_hmac(b"key", b"data", HashAlgorithm.SHA384)
        assert len(mac) == 48

    def test_verify_hmac_different_algorithms(self):
        for alg in [HashAlgorithm.SHA256, HashAlgorithm.SHA512]:
            mac = compute_hmac(b"key", b"data", alg)
            assert verify_hmac(b"key", b"data", mac, alg)

    def test_iterated_hash_single_iteration(self):
        result = iterated_hash(b"data", 1)
        expected = hash_digest(b"data")
        assert result == expected

    def test_iterated_hash_negative_raises(self):
        with pytest.raises(HashError):
            iterated_hash(b"data", -1)

    def test_hash_to_int_deterministic(self):
        a = hash_to_int(b"test")
        b = hash_to_int(b"test")
        assert a == b

    def test_fingerprint_empty_data(self):
        fp = fingerprint(b"")
        assert len(fp) == 16

    def test_hash_hex_different_algorithms(self):
        h1 = hash_hex(b"data", HashAlgorithm.SHA256)
        h2 = hash_hex(b"data", HashAlgorithm.SHA512)
        assert len(h1) == 64
        assert len(h2) == 128


class TestMasterKeyExtended:
    def test_derive_wrapping_key_deterministic(self):
        mk = MasterKey(key_id="mk1", key_material=b"\x00" * 32)
        wk1 = mk.derive_wrapping_key()
        wk2 = mk.derive_wrapping_key()
        assert wk1 == wk2

    def test_derive_wrapping_key_different_versions(self):
        mk = MasterKey(key_id="mk1", key_material=b"\x00" * 32, version=1)
        wk1 = mk.derive_wrapping_key()
        mk2 = MasterKey(key_id="mk1", key_material=b"\x00" * 32, version=2)
        wk2 = mk2.derive_wrapping_key()
        assert wk1 != wk2

    def test_derive_wrapping_key_different_context(self):
        mk = MasterKey(key_id="mk1", key_material=b"\x00" * 32)
        wk1 = mk.derive_wrapping_key(b"wrap")
        wk2 = mk.derive_wrapping_key(b"other")
        assert wk1 != wk2


class TestCipherSuiteCombinations:
    def test_all_key_sizes_ctr(self):
        for size in [16, 24, 32]:
            key = generate_key(size)
            for data_len in [0, 1, 15, 16, 17, 100, 1000]:
                data = b"X" * data_len
                ct = encrypt_ctr(data, key)
                assert decrypt_ctr(ct, key) == data

    def test_all_key_sizes_cbc(self):
        for size in [16, 24, 32]:
            key = generate_key(size)
            for data_len in [0, 1, 15, 16, 17, 100]:
                data = b"Y" * data_len
                ct = encrypt_cbc(data, key)
                assert decrypt_cbc(ct, key) == data

    def test_all_key_sizes_gcm(self):
        for size in [16, 24, 32]:
            key = generate_key(size)
            for data_len in [0, 1, 15, 16, 17, 100]:
                data = b"Z" * data_len
                ct = encrypt_gcm(data, key)
                assert decrypt_gcm(ct, key) == data

    def test_symmetric_cipher_all_modes_all_sizes(self):
        for size in [16, 24, 32]:
            key = generate_key(size)
            for mode in CipherMode:
                cipher = SymmetricCipher(key, mode)
                ct = cipher.encrypt(b"test data for cipher suite")
                pt = cipher.decrypt(ct)
                assert pt == b"test data for cipher suite"

    def test_gcm_various_aad_lengths(self):
        key = generate_key(32)
        for aad_len in [0, 1, 16, 100, 1000]:
            aad = b"A" * aad_len
            ct = encrypt_gcm(b"payload", key, aad=aad)
            assert decrypt_gcm(ct, key) == b"payload"

    def test_ctr_binary_data(self):
        key = generate_key(32)
        data = bytes(range(256))
        ct = encrypt_ctr(data, key)
        assert decrypt_ctr(ct, key) == data

    def test_cbc_binary_data(self):
        key = generate_key(32)
        data = bytes(range(256))
        ct = encrypt_cbc(data, key)
        assert decrypt_cbc(ct, key) == data

    def test_gcm_binary_data(self):
        key = generate_key(32)
        data = bytes(range(256))
        ct = encrypt_gcm(data, key)
        assert decrypt_gcm(ct, key) == data


class TestRandomUtilitiesExtended:
    def test_generate_token_various_lengths(self):
        for length in [1, 8, 16, 32, 64]:
            token = generate_token(length)
            assert len(token) > 0

    def test_generate_hex_token_various_lengths(self):
        for length in [1, 8, 16, 32, 64]:
            token = generate_hex_token(length)
            assert len(token) == length
            int(token, 16)

    def test_generate_id_various_lengths(self):
        for length in [1, 4, 8, 16, 32]:
            id_ = generate_id("pfx", length)
            assert id_.startswith("pfx_")

    def test_secure_random_bytes_various_sizes(self):
        for size in [1, 16, 32, 64, 128, 256]:
            data = secure_random_bytes(size)
            assert len(data) == size

    def test_secure_shuffle_preserves_length(self):
        for length in [0, 1, 5, 10, 50]:
            items = list(range(length))
            shuffled = secure_shuffle(items)
            assert len(shuffled) == length
            assert sorted(shuffled) == items

    def test_secure_sample_zero(self):
        result = secure_sample([1, 2, 3], 0)
        assert result == []

    def test_secure_sample_all(self):
        result = secure_sample([1, 2, 3], 3)
        assert sorted(result) == [1, 2, 3]

    def test_uuid_format_detailed(self):
        for _ in range(10):
            uuid = generate_uuid_v4()
            assert len(uuid) == 36
            assert uuid[8] == "-"
            assert uuid[13] == "-"
            assert uuid[14] == "4"
            assert uuid[18] == "-"
            assert uuid[23] == "-"

    def test_constant_time_compare_various(self):
        assert constant_time_compare(b"", b"")
        assert constant_time_compare(b"\x00", b"\x00")
        assert not constant_time_compare(b"\x00", b"\x01")
        assert constant_time_compare(b"a" * 100, b"a" * 100)


class TestHashChainAlgorithms:
    def test_chain_sha512(self):
        chain = HashChain(algorithm=HashAlgorithm.SHA512)
        for i in range(10):
            chain.append(f"data-{i}".encode())
        assert chain.verify()
        assert len(chain.last_hash) == 64

    def test_chain_blake2b(self):
        chain = HashChain(algorithm=HashAlgorithm.BLAKE2B)
        for i in range(10):
            chain.append(f"data-{i}".encode())
        assert chain.verify()
        assert len(chain.last_hash) == 64

    def test_chain_blake2s(self):
        chain = HashChain(algorithm=HashAlgorithm.BLAKE2S)
        for i in range(10):
            chain.append(f"data-{i}".encode())
        assert chain.verify()
        assert len(chain.last_hash) == 32

    def test_chain_sha384(self):
        chain = HashChain(algorithm=HashAlgorithm.SHA384)
        for i in range(10):
            chain.append(f"data-{i}".encode())
        assert chain.verify()
        assert len(chain.last_hash) == 48


class TestMerkleTreeAlgorithms:
    def test_merkle_sha512(self):
        leaves = [f"leaf-{i}".encode() for i in range(8)]
        tree = MerkleTree(leaves, algorithm=HashAlgorithm.SHA512)
        assert tree.verify_tree()
        assert len(tree.root) == 64

    def test_merkle_blake2b(self):
        leaves = [f"leaf-{i}".encode() for i in range(4)]
        tree = MerkleTree(leaves, algorithm=HashAlgorithm.BLAKE2B)
        assert tree.verify_tree()
        proof = tree.get_proof(2)
        assert tree.verify_proof(leaves[2], 2, proof)

    def test_merkle_blake2s(self):
        leaves = [f"leaf-{i}".encode() for i in range(4)]
        tree = MerkleTree(leaves, algorithm=HashAlgorithm.BLAKE2S)
        assert tree.verify_tree()
        assert len(tree.root) == 32


class TestEnvelopeHierarchyRotation:
    def test_rotate_multiple_and_list(self):
        h = KeyHierarchy()
        h.add_master_key(MasterKey.generate("mk1"))
        for i in range(5):
            h.rotate_master_key()
        assert h.master_key_count == 6
        assert len(h.list_master_keys()) == 6

    def test_get_master_key_by_id(self):
        h = KeyHierarchy()
        mk = MasterKey.generate("mk1")
        h.add_master_key(mk)
        assert h.get_master_key("mk1") == mk
        assert h.get_master_key("nonexistent") is None

    def test_add_master_key_deactivates_previous(self):
        h = KeyHierarchy()
        mk1 = MasterKey.generate("mk1")
        mk2 = MasterKey.generate("mk2")
        h.add_master_key(mk1)
        assert mk1.is_active
        h.add_master_key(mk2)
        assert not mk1.is_active
        assert mk2.is_active

    def test_add_without_set_active(self):
        h = KeyHierarchy()
        mk1 = MasterKey.generate("mk1")
        mk2 = MasterKey.generate("mk2")
        h.add_master_key(mk1)
        h.add_master_key(mk2, set_active=False)
        assert h.active_master_key == mk1
