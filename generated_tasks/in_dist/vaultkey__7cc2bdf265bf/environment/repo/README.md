# VaultKey

A secrets management and encryption toolkit for Python applications.

VaultKey provides a comprehensive set of tools for managing cryptographic keys,
encrypting and decrypting secrets, enforcing access control policies, and
maintaining audit trails. Inspired by HashiCorp Vault's architecture, VaultKey
is designed for applications that need robust secrets management without
external dependencies.

## Features

- **Cryptographic Operations**: Key derivation (PBKDF2, scrypt-like, Argon2-like),
  symmetric encryption (AES-CTR, AES-CBC, AES-GCM), secure hashing (SHA256,
  SHA512, BLAKE2), and envelope encryption with key hierarchies.
- **Secret Storage**: Versioned secret store with namespace support, metadata
  tracking, and batch operations.
- **Key Rotation**: Automated rotation policies with grace periods, rollback
  support, and rotation history tracking.
- **Vault Sealing**: Shamir's Secret Sharing for seal/unseal operations with
  configurable threshold schemes.
- **Transit Encryption**: Encrypt, decrypt, and rewrap data without exposing
  encryption keys, with sign/verify support.
- **Access Control**: Path-based policy engine with capabilities (read, write,
  delete, list), deny-overrides-allow semantics, and group inheritance.
- **Identity Management**: Entities, aliases, groups, and hierarchical
  identity resolution.
- **Token System**: Token creation, renewal, revocation, TTL management,
  orphan tokens, and accessor-based lookup.
- **Auth Backends**: Pluggable authentication with userpass, token-based,
  app-role, and certificate-based validators.
- **Audit Logging**: Structured event logging with tamper detection via hash
  chains, log rotation, sensitive field redaction, and compliance reporting.
- **Lease Management**: TTL-based lease tracking with renewal, revocation,
  and max-TTL enforcement.
- **Plugin System**: Extensible engine mounting with middleware hooks and
  lifecycle callbacks.
- **Transport Security**: TLS-like handshake simulation, wire protocol with
  message framing, and multiple encoding formats.

## Installation

```bash
pip install vaultkey
```

Or install from source:

```bash
git clone https://github.com/amitmaurya/vaultkey.git
cd vaultkey
pip install -e .
```

## Quick Start

```python
from vaultkey.vault.store import SecretStore
from vaultkey.vault.sealing import SealManager
from vaultkey.crypto.kdf import KeyDerivation
from vaultkey.access.policy import PolicyEngine

# Initialize components
store = SecretStore()
seal_manager = SealManager(shares=5, threshold=3)

# Generate seal keys
seal_keys = seal_manager.initialize()

# Unseal the vault
for key in seal_keys[:3]:
    seal_manager.unseal(key)

# Store a secret
store.put("secret/database/password", b"super-secret-value", metadata={"owner": "dba"})

# Retrieve the secret
secret = store.get("secret/database/password")
print(secret.value)

# Set up access control
engine = PolicyEngine()
engine.add_policy("dba-policy", {
    "path": "secret/database/*",
    "capabilities": ["read", "list"],
})
```

## Architecture

VaultKey follows a layered architecture:

```
┌─────────────────────────────────────┐
│           Transport Layer           │
│  (TLS, Protocol, Encoding)         │
├─────────────────────────────────────┤
│           Access Control            │
│  (Policy, Identity, Tokens, Auth)  │
├─────────────────────────────────────┤
│           Vault Core                │
│  (Store, Rotation, Seal, Transit)  │
├─────────────────────────────────────┤
│         Cryptographic Layer         │
│  (KDF, Symmetric, Hash, Envelope) │
├─────────────────────────────────────┤
│           Engine Layer              │
│  (Backend, Lease, Mount, Plugin)   │
├─────────────────────────────────────┤
│           Audit Layer               │
│  (Logger, Filter, Compliance)      │
└─────────────────────────────────────┘
```

## Configuration

VaultKey can be configured programmatically:

```python
from vaultkey.engine.backend import InMemoryBackend, FileBackend
from vaultkey.engine.mount import MountTable
from vaultkey.audit.logger import AuditLogger

# Use file-based backend for persistence
backend = FileBackend("/var/vaultkey/data")

# Set up mount points
mounts = MountTable()
mounts.mount("secret/", engine_type="kv", config={"version": 2})
mounts.mount("transit/", engine_type="transit")

# Enable audit logging
audit = AuditLogger(path="/var/log/vaultkey/audit.log")
```

## Testing

```bash
# Run all tests
PYTHONPATH=src python -m pytest tests/ -v

# Run with coverage
PYTHONPATH=src python -m pytest tests/ --cov=vaultkey --cov-report=term-missing

# Run specific test module
PYTHONPATH=src python -m pytest tests/test_crypto.py -v
```

## Docker

```bash
# Build the image
docker build -t vaultkey .

# Run tests in container
docker run --rm vaultkey

# Run with coverage
docker run --rm vaultkey python3 -m pytest tests/ --cov=vaultkey
```

## Development

```bash
# Clone the repository
git clone https://github.com/amitmaurya/vaultkey.git
cd vaultkey

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest tests/ -v
```

## Security Considerations

- VaultKey implements cryptographic primitives for educational and application
  use. For production systems handling highly sensitive data, consider using
  established solutions like HashiCorp Vault.
- The Shamir's Secret Sharing implementation uses finite field arithmetic
  over a large prime for share generation and reconstruction.
- All encryption operations use cryptographically secure random number
  generation via `os.urandom`.
- Audit logs include hash chain verification to detect tampering.
- Token TTLs and lease management prevent stale access.

## License

MIT License. See [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Changelog

### 0.5.4 (2024-07-15)
- Added compliance reporting module
- Improved audit log rotation with hash chain continuity
- Fixed edge case in Shamir's share reconstruction

### 0.5.0 (2024-05-01)
- Added transit encryption engine
- Envelope encryption with key hierarchy
- Plugin system for custom engines

### 0.4.0 (2024-02-15)
- Access control policy engine
- Identity and group management
- Token system with TTL support

### 0.3.0 (2023-11-01)
- Vault sealing with Shamir's Secret Sharing
- Key rotation with grace periods
- Audit logging with tamper detection

### 0.2.0 (2023-08-01)
- Symmetric encryption (AES modes)
- Key derivation functions
- Basic secret store

### 0.1.0 (2023-04-15)
- Initial release
- Core cryptographic utilities
- In-memory storage backend
