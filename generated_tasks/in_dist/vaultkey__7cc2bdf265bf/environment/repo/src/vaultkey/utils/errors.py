"""Error hierarchy for VaultKey."""
from __future__ import annotations

from typing import Any


class VaultError(Exception):
    """Base exception for all VaultKey errors."""

    def __init__(self, message: str, code: str = "VAULT_ERROR", details: dict[str, Any] | None = None) -> None:
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(message)

    def to_dict(self) -> dict[str, Any]:
        return {
            "error": self.code,
            "message": self.message,
            "details": self.details,
        }

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(code={self.code!r}, message={self.message!r})"


class CryptoError(VaultError):
    """Raised when a cryptographic operation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, code="CRYPTO_ERROR", details=details)


class KeyDerivationError(CryptoError):
    """Raised when key derivation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, details=details)
        self.code = "KEY_DERIVATION_ERROR"


class EncryptionError(CryptoError):
    """Raised when encryption or decryption fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, details=details)
        self.code = "ENCRYPTION_ERROR"


class HashError(CryptoError):
    """Raised when a hashing operation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, details=details)
        self.code = "HASH_ERROR"


class AccessDenied(VaultError):
    """Raised when access is denied to a resource."""

    def __init__(self, message: str = "access denied", path: str = "", details: dict[str, Any] | None = None) -> None:
        d = details or {}
        if path:
            d["path"] = path
        super().__init__(message, code="ACCESS_DENIED", details=d)
        self.path = path


class PolicyError(VaultError):
    """Raised when a policy evaluation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, code="POLICY_ERROR", details=details)


class SealedError(VaultError):
    """Raised when an operation is attempted on a sealed vault."""

    def __init__(self, message: str = "vault is sealed", details: dict[str, Any] | None = None) -> None:
        super().__init__(message, code="SEALED", details=details)


class UnsealError(VaultError):
    """Raised when unsealing fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, code="UNSEAL_ERROR", details=details)


class LeaseExpired(VaultError):
    """Raised when a lease has expired."""

    def __init__(self, lease_id: str, details: dict[str, Any] | None = None) -> None:
        d = details or {}
        d["lease_id"] = lease_id
        super().__init__(f"lease expired: {lease_id}", code="LEASE_EXPIRED", details=d)
        self.lease_id = lease_id


class LeaseNotFound(VaultError):
    """Raised when a lease is not found."""

    def __init__(self, lease_id: str) -> None:
        super().__init__(f"lease not found: {lease_id}", code="LEASE_NOT_FOUND", details={"lease_id": lease_id})
        self.lease_id = lease_id


class SecretNotFound(VaultError):
    """Raised when a secret is not found."""

    def __init__(self, path: str) -> None:
        super().__init__(f"secret not found: {path}", code="SECRET_NOT_FOUND", details={"path": path})
        self.path = path


class SecretVersionNotFound(VaultError):
    """Raised when a specific version of a secret is not found."""

    def __init__(self, path: str, version: int) -> None:
        super().__init__(
            f"version {version} not found for secret: {path}",
            code="VERSION_NOT_FOUND",
            details={"path": path, "version": version},
        )
        self.path = path
        self.version = version


class TokenError(VaultError):
    """Raised when a token operation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, code="TOKEN_ERROR", details=details)


class TokenExpired(TokenError):
    """Raised when a token has expired."""

    def __init__(self, token_id: str) -> None:
        super().__init__(f"token expired: {token_id}", details={"token_id": token_id})
        self.code = "TOKEN_EXPIRED"


class TokenRevoked(TokenError):
    """Raised when a revoked token is used."""

    def __init__(self, token_id: str) -> None:
        super().__init__(f"token revoked: {token_id}", details={"token_id": token_id})
        self.code = "TOKEN_REVOKED"


class AuthenticationError(VaultError):
    """Raised when authentication fails."""

    def __init__(self, message: str = "authentication failed", details: dict[str, Any] | None = None) -> None:
        super().__init__(message, code="AUTH_ERROR", details=details)


class MountError(VaultError):
    """Raised when a mount operation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, code="MOUNT_ERROR", details=details)


class PluginError(VaultError):
    """Raised when a plugin operation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, code="PLUGIN_ERROR", details=details)


class BackendError(VaultError):
    """Raised when a storage backend operation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, code="BACKEND_ERROR", details=details)


class TransactionError(BackendError):
    """Raised when a transaction fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, details=details)
        self.code = "TRANSACTION_ERROR"


class AuditError(VaultError):
    """Raised when an audit operation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, code="AUDIT_ERROR", details=details)


class TamperDetected(AuditError):
    """Raised when audit log tampering is detected."""

    def __init__(self, message: str = "audit log tamper detected", details: dict[str, Any] | None = None) -> None:
        super().__init__(message, details=details)
        self.code = "TAMPER_DETECTED"


class RotationError(VaultError):
    """Raised when a key rotation operation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, code="ROTATION_ERROR", details=details)


class TransportError(VaultError):
    """Raised when a transport operation fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, code="TRANSPORT_ERROR", details=details)


class HandshakeError(TransportError):
    """Raised when a TLS handshake fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, details=details)
        self.code = "HANDSHAKE_ERROR"


class ProtocolError(TransportError):
    """Raised when a protocol violation occurs."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, details=details)
        self.code = "PROTOCOL_ERROR"


class EncodingError(VaultError):
    """Raised when encoding or decoding fails."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, code="ENCODING_ERROR", details=details)


class ErrorChain:
    """Tracks a chain of related errors."""

    def __init__(self, root_error: VaultError | None = None) -> None:
        self._errors: list[VaultError] = []
        if root_error:
            self._errors.append(root_error)

    def add(self, error: VaultError) -> ErrorChain:
        self._errors.append(error)
        return self

    @property
    def root(self) -> VaultError | None:
        return self._errors[0] if self._errors else None

    @property
    def latest(self) -> VaultError | None:
        return self._errors[-1] if self._errors else None

    @property
    def depth(self) -> int:
        return len(self._errors)

    def all_codes(self) -> list[str]:
        return [e.code for e in self._errors]

    def all_messages(self) -> list[str]:
        return [e.message for e in self._errors]

    def to_dict(self) -> dict[str, Any]:
        return {
            "chain_depth": self.depth,
            "root_code": self.root.code if self.root else None,
            "latest_code": self.latest.code if self.latest else None,
            "errors": [e.to_dict() for e in self._errors],
        }

    def has_code(self, code: str) -> bool:
        return any(e.code == code for e in self._errors)

    def __len__(self) -> int:
        return len(self._errors)

    def __iter__(self):
        return iter(self._errors)


class ErrorAggregator:
    """Collects and aggregates multiple errors."""

    def __init__(self, max_errors: int = 100) -> None:
        self._errors: list[VaultError] = []
        self._max_errors = max_errors
        self._counts: dict[str, int] = {}

    def add(self, error: VaultError) -> None:
        if len(self._errors) < self._max_errors:
            self._errors.append(error)
        self._counts[error.code] = self._counts.get(error.code, 0) + 1

    @property
    def has_errors(self) -> bool:
        return len(self._errors) > 0

    @property
    def error_count(self) -> int:
        return sum(self._counts.values())

    def errors_by_code(self) -> dict[str, list[VaultError]]:
        groups: dict[str, list[VaultError]] = {}
        for e in self._errors:
            if e.code not in groups:
                groups[e.code] = []
            groups[e.code].append(e)
        return groups

    def summary(self) -> dict[str, int]:
        return dict(self._counts)

    def most_common(self, n: int = 5) -> list[tuple[str, int]]:
        items = sorted(self._counts.items(), key=lambda x: x[1], reverse=True)
        return items[:n]

    def clear(self) -> None:
        self._errors.clear()
        self._counts.clear()

    def raise_if_errors(self) -> None:
        """Raise the first error if any exist."""
        if self._errors:
            raise self._errors[0]

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_errors": self.error_count,
            "unique_codes": len(self._counts),
            "counts": dict(self._counts),
        }


class ErrorRateTracker:
    """Tracks error rates over time windows."""

    def __init__(self, window_seconds: float = 60.0) -> None:
        self._window = window_seconds
        self._timestamps: list[float] = []
        self._total_operations = 0

    def record_error(self) -> None:
        import time
        self._timestamps.append(time.time())
        self._cleanup()

    def record_operation(self) -> None:
        self._total_operations += 1

    def error_rate(self) -> float:
        """Errors per second in the current window."""
        self._cleanup()
        if not self._timestamps:
            return 0.0
        return len(self._timestamps) / self._window

    def error_percentage(self) -> float:
        """Percentage of operations that resulted in errors."""
        if self._total_operations == 0:
            return 0.0
        self._cleanup()
        return (len(self._timestamps) / self._total_operations) * 100.0

    def errors_in_window(self) -> int:
        self._cleanup()
        return len(self._timestamps)

    def _cleanup(self) -> None:
        import time
        cutoff = time.time() - self._window
        self._timestamps = [t for t in self._timestamps if t > cutoff]

    def reset(self) -> None:
        self._timestamps.clear()
        self._total_operations = 0

    def is_above_threshold(self, threshold: float) -> bool:
        return self.error_rate() > threshold


class ErrorContextManager:
    """Context manager that catches and wraps exceptions as VaultErrors."""

    def __init__(
        self,
        error_class: type[VaultError] = VaultError,
        message_prefix: str = "",
        reraise: bool = True,
    ) -> None:
        self._error_class = error_class
        self._message_prefix = message_prefix
        self._reraise = reraise
        self._caught_error: VaultError | None = None

    def __enter__(self) -> ErrorContextManager:
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> bool:
        if exc_val is None:
            return False
        if isinstance(exc_val, VaultError):
            self._caught_error = exc_val
            if self._reraise:
                return False
            return True
        message = f"{self._message_prefix}{exc_val}" if self._message_prefix else str(exc_val)
        wrapped = self._error_class(message)
        self._caught_error = wrapped
        if self._reraise:
            raise wrapped from exc_val
        return True

    @property
    def error(self) -> VaultError | None:
        return self._caught_error

    @property
    def had_error(self) -> bool:
        return self._caught_error is not None


class ErrorSerializer:
    """Serializes errors for transport or logging."""

    def serialize(self, error: VaultError) -> dict[str, Any]:
        """Serialize a VaultError to a dictionary."""
        result = error.to_dict()
        result["type"] = type(error).__name__
        if error.__cause__:
            result["cause"] = {
                "type": type(error.__cause__).__name__,
                "message": str(error.__cause__),
            }
        return result

    def serialize_chain(self, chain: ErrorChain) -> dict[str, Any]:
        return {
            "chain": [self.serialize(e) for e in chain],
            "depth": chain.depth,
        }

    def deserialize(self, data: dict[str, Any]) -> VaultError:
        """Deserialize a dictionary back to a VaultError."""
        error_type = data.get("type", "VaultError")
        message = data.get("message", "unknown error")
        code = data.get("error", "VAULT_ERROR")
        details = data.get("details", {})
        type_map: dict[str, type[VaultError]] = {
            "VaultError": VaultError,
            "CryptoError": CryptoError,
            "EncryptionError": EncryptionError,
            "KeyDerivationError": KeyDerivationError,
            "HashError": HashError,
            "AccessDenied": AccessDenied,
            "SealedError": SealedError,
            "TokenError": TokenError,
            "AuthenticationError": AuthenticationError,
            "BackendError": BackendError,
            "TransportError": TransportError,
            "EncodingError": EncodingError,
        }
        cls = type_map.get(error_type, VaultError)
        try:
            err = cls(message, details=details)
            err.code = code
            return err
        except TypeError:
            return VaultError(message, code=code, details=details)

    def to_json(self, error: VaultError) -> str:
        import json
        return json.dumps(self.serialize(error), sort_keys=True)

    def from_json(self, json_str: str) -> VaultError:
        import json
        data = json.loads(json_str)
        return self.deserialize(data)
