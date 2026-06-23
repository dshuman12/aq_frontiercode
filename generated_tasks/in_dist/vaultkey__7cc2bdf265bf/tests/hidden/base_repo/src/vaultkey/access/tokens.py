"""Token system for authentication and authorization."""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from vaultkey.crypto.random import generate_id, generate_token
from vaultkey.utils.errors import TokenError, TokenExpired, TokenRevoked


class TokenType(Enum):
    SERVICE = "service"
    BATCH = "batch"


@dataclass
class Token:
    """An authentication token."""
    token_id: str
    accessor: str
    policies: list[str]
    token_type: TokenType = TokenType.SERVICE
    ttl: float = 3600.0
    max_ttl: float = 0.0
    created_at: float = field(default_factory=time.time)
    expire_time: float = 0.0
    renewable: bool = True
    num_uses: int = 0
    uses_remaining: int = 0
    parent_id: str | None = None
    entity_id: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)
    is_orphan: bool = False
    is_revoked: bool = False
    revoked_at: float | None = None
    period: float = 0.0
    explicit_max_ttl: float = 0.0

    def __post_init__(self) -> None:
        if self.expire_time == 0.0 and self.ttl > 0:
            self.expire_time = self.created_at + self.ttl
        if self.num_uses > 0 and self.uses_remaining == 0:
            self.uses_remaining = self.num_uses

    @property
    def is_expired(self) -> bool:
        if self.ttl <= 0:
            return False
        return time.time() >= self.expire_time

    @property
    def is_valid(self) -> bool:
        if self.is_revoked:
            return False
        if self.is_expired:
            return False
        if self.num_uses > 0 and self.uses_remaining <= 0:
            return False
        return True

    @property
    def remaining_ttl(self) -> float:
        if self.ttl <= 0:
            return float("inf")
        return max(0.0, self.expire_time - time.time())

    def use(self) -> None:
        if self.num_uses > 0:
            if self.uses_remaining <= 0:
                raise TokenError("token has no remaining uses")
            self.uses_remaining -= 1

    def revoke(self) -> None:
        self.is_revoked = True
        self.revoked_at = time.time()

    def to_dict(self) -> dict[str, Any]:
        return {
            "token_id": self.token_id[:8] + "...",
            "accessor": self.accessor,
            "policies": list(self.policies),
            "token_type": self.token_type.value,
            "ttl": self.ttl,
            "renewable": self.renewable,
            "entity_id": self.entity_id,
            "is_orphan": self.is_orphan,
            "num_uses": self.num_uses,
            "expire_time": self.expire_time,
        }


class TokenStore:
    """Manages token lifecycle."""

    def __init__(self) -> None:
        self._tokens: dict[str, Token] = {}
        self._accessor_index: dict[str, str] = {}
        self._children: dict[str, list[str]] = {}

    def create(
        self,
        policies: list[str],
        ttl: float = 3600.0,
        max_ttl: float = 0.0,
        renewable: bool = True,
        token_type: TokenType = TokenType.SERVICE,
        parent_id: str | None = None,
        entity_id: str | None = None,
        metadata: dict[str, str] | None = None,
        num_uses: int = 0,
        is_orphan: bool = False,
        period: float = 0.0,
        explicit_max_ttl: float = 0.0,
    ) -> Token:
        """Create a new token."""
        if parent_id and not is_orphan:
            parent = self._tokens.get(parent_id)
            if parent is None:
                raise TokenError("parent token not found")
            if parent.is_revoked:
                raise TokenRevoked(parent_id)

        token_id = generate_token(32)
        accessor = generate_id("accessor", 12)

        token = Token(
            token_id=token_id,
            accessor=accessor,
            policies=list(policies),
            token_type=token_type,
            ttl=ttl,
            max_ttl=max_ttl,
            renewable=renewable,
            num_uses=num_uses,
            parent_id=parent_id if not is_orphan else None,
            entity_id=entity_id,
            metadata=dict(metadata or {}),
            is_orphan=is_orphan,
            period=period,
            explicit_max_ttl=explicit_max_ttl,
        )

        self._tokens[token_id] = token
        self._accessor_index[accessor] = token_id

        if parent_id and not is_orphan:
            if parent_id not in self._children:
                self._children[parent_id] = []
            self._children[parent_id].append(token_id)

        return token

    def lookup(self, token_id: str) -> Token:
        """Look up a token by ID."""
        token = self._tokens.get(token_id)
        if token is None:
            raise TokenError("token not found")
        if token.is_revoked:
            raise TokenRevoked(token_id)
        if token.is_expired:
            raise TokenExpired(token_id)
        return token

    def lookup_accessor(self, accessor: str) -> Token:
        """Look up a token by accessor."""
        token_id = self._accessor_index.get(accessor)
        if token_id is None:
            raise TokenError("accessor not found")
        return self.lookup(token_id)

    def renew(self, token_id: str, increment: float = 0) -> Token:
        """Renew a token's TTL."""
        token = self.lookup(token_id)

        if not token.renewable:
            raise TokenError("token is not renewable")

        if token.period > 0:
            new_ttl = token.period
        elif increment > 0:
            new_ttl = increment
        else:
            new_ttl = token.ttl

        if token.explicit_max_ttl > 0:
            max_expire = token.created_at + token.explicit_max_ttl
            new_expire = time.time() + new_ttl
            if new_expire > max_expire:
                new_ttl = max(0, max_expire - time.time())

        if token.max_ttl > 0:
            max_expire = token.created_at + token.max_ttl
            new_expire = time.time() + new_ttl
            if new_expire > max_expire:
                new_ttl = max(0, max_expire - time.time())

        token.expire_time = time.time() + new_ttl
        token.ttl = new_ttl
        return token

    def revoke(self, token_id: str) -> int:
        """Revoke a token and all its children. Returns count revoked."""
        token = self._tokens.get(token_id)
        if token is None:
            return 0
        return self._revoke_tree(token_id)

    def _revoke_tree(self, token_id: str) -> int:
        token = self._tokens.get(token_id)
        if token is None or token.is_revoked:
            return 0

        count = 1
        token.revoke()

        children = self._children.get(token_id, [])
        for child_id in children:
            count += self._revoke_tree(child_id)

        return count

    def revoke_accessor(self, accessor: str) -> int:
        """Revoke a token by its accessor."""
        token_id = self._accessor_index.get(accessor)
        if token_id is None:
            raise TokenError("accessor not found")
        return self.revoke(token_id)

    def revoke_orphan(self, token_id: str) -> None:
        """Revoke a token without revoking its children (orphan them)."""
        token = self._tokens.get(token_id)
        if token is None:
            raise TokenError("token not found")
        token.revoke()
        children = self._children.get(token_id, [])
        for child_id in children:
            child = self._tokens.get(child_id)
            if child:
                child.parent_id = None
                child.is_orphan = True
        self._children.pop(token_id, None)

    def list_accessors(self) -> list[str]:
        return list(self._accessor_index.keys())

    def tidy(self) -> int:
        """Remove expired and revoked tokens. Returns count removed."""
        to_remove: list[str] = []
        for token_id, token in self._tokens.items():
            if token.is_revoked or token.is_expired:
                to_remove.append(token_id)

        for token_id in to_remove:
            token = self._tokens.pop(token_id)
            self._accessor_index.pop(token.accessor, None)
            self._children.pop(token_id, None)

        return len(to_remove)

    def count(self, include_revoked: bool = False) -> int:
        if include_revoked:
            return len(self._tokens)
        return sum(1 for t in self._tokens.values() if not t.is_revoked)

    def children(self, token_id: str) -> list[Token]:
        child_ids = self._children.get(token_id, [])
        return [self._tokens[cid] for cid in child_ids if cid in self._tokens]

    def bind_lease(self, token_id: str, lease_id: str) -> bool:
        """Bind a lease to a token."""
        token = self._tokens.get(token_id)
        if token is None:
            return False
        if "_leases" not in token.metadata:
            token.metadata["_leases"] = ""
        existing = token.metadata["_leases"]
        if existing:
            token.metadata["_leases"] = existing + "," + lease_id
        else:
            token.metadata["_leases"] = lease_id
        return True

    def get_bound_leases(self, token_id: str) -> list[str]:
        """Get lease IDs bound to a token."""
        token = self._tokens.get(token_id)
        if token is None:
            return []
        leases_str = token.metadata.get("_leases", "")
        if not leases_str:
            return []
        return [l.strip() for l in leases_str.split(",") if l.strip()]

    def unbind_lease(self, token_id: str, lease_id: str) -> bool:
        token = self._tokens.get(token_id)
        if token is None:
            return False
        leases = self.get_bound_leases(token_id)
        if lease_id not in leases:
            return False
        leases.remove(lease_id)
        token.metadata["_leases"] = ",".join(leases)
        return True


class BatchTokenOperations:
    """Batch operations on tokens."""

    def __init__(self, store: TokenStore) -> None:
        self._store = store

    def batch_create(
        self,
        count: int,
        policies: list[str],
        ttl: float = 3600.0,
        token_type: TokenType = TokenType.BATCH,
    ) -> list[Token]:
        tokens: list[Token] = []
        for _ in range(count):
            token = self._store.create(
                policies=policies,
                ttl=ttl,
                token_type=token_type,
                is_orphan=True,
            )
            tokens.append(token)
        return tokens

    def batch_revoke(self, token_ids: list[str]) -> int:
        count = 0
        for tid in token_ids:
            count += self._store.revoke(tid)
        return count

    def batch_renew(self, token_ids: list[str], increment: float = 0) -> list[Token | None]:
        results: list[Token | None] = []
        for tid in token_ids:
            try:
                token = self._store.renew(tid, increment)
                results.append(token)
            except (TokenError, TokenExpired, TokenRevoked):
                results.append(None)
        return results

    def batch_lookup(self, token_ids: list[str]) -> dict[str, Token | None]:
        results: dict[str, Token | None] = {}
        for tid in token_ids:
            try:
                results[tid] = self._store.lookup(tid)
            except (TokenError, TokenExpired, TokenRevoked):
                results[tid] = None
        return results


class TokenPolicyResolver:
    """Resolves effective policies for a token, including inherited policies."""

    def __init__(self, store: TokenStore) -> None:
        self._store = store

    def resolve_policies(self, token_id: str) -> list[str]:
        """Resolve the full set of policies for a token, including parent chain."""
        policies: list[str] = []
        visited: set[str] = set()
        self._collect_policies(token_id, policies, visited)
        return list(dict.fromkeys(policies))

    def _collect_policies(self, token_id: str, policies: list[str], visited: set[str]) -> None:
        if token_id in visited:
            return
        visited.add(token_id)
        token = self._store._tokens.get(token_id)
        if token is None:
            return
        policies.extend(token.policies)
        if token.parent_id and not token.is_orphan:
            self._collect_policies(token.parent_id, policies, visited)

    def has_policy(self, token_id: str, policy_name: str) -> bool:
        return policy_name in self.resolve_policies(token_id)


@dataclass
class TokenAuditEntry:
    """Audit trail entry for token operations."""
    entry_id: str
    token_accessor: str
    operation: str
    timestamp: float = field(default_factory=time.time)
    success: bool = True
    details: dict[str, Any] = field(default_factory=dict)


class TokenAuditTrail:
    """Tracks token lifecycle events."""

    def __init__(self, max_entries: int = 10000) -> None:
        self._entries: list[TokenAuditEntry] = []
        self._max_entries = max_entries

    def log(self, accessor: str, operation: str, success: bool = True, details: dict[str, Any] | None = None) -> TokenAuditEntry:
        entry = TokenAuditEntry(
            entry_id=generate_id("taud"),
            token_accessor=accessor,
            operation=operation,
            success=success,
            details=dict(details or {}),
        )
        if len(self._entries) >= self._max_entries:
            self._entries.pop(0)
        self._entries.append(entry)
        return entry

    def get_entries(
        self,
        accessor: str | None = None,
        operation: str | None = None,
        since: float = 0,
    ) -> list[TokenAuditEntry]:
        results = self._entries
        if accessor:
            results = [e for e in results if e.token_accessor == accessor]
        if operation:
            results = [e for e in results if e.operation == operation]
        if since:
            results = [e for e in results if e.timestamp >= since]
        return results

    @property
    def total_entries(self) -> int:
        return len(self._entries)

    def clear(self) -> None:
        self._entries.clear()


class TokenUsageStatistics:
    """Tracks token usage statistics."""

    def __init__(self) -> None:
        self._usage_counts: dict[str, int] = {}
        self._last_used: dict[str, float] = {}
        self._total_lookups = 0
        self._total_renewals = 0
        self._total_revocations = 0

    def record_lookup(self, accessor: str) -> None:
        self._usage_counts[accessor] = self._usage_counts.get(accessor, 0) + 1
        self._last_used[accessor] = time.time()
        self._total_lookups += 1

    def record_renewal(self, accessor: str) -> None:
        self._last_used[accessor] = time.time()
        self._total_renewals += 1

    def record_revocation(self, accessor: str) -> None:
        self._last_used[accessor] = time.time()
        self._total_revocations += 1

    def get_usage_count(self, accessor: str) -> int:
        return self._usage_counts.get(accessor, 0)

    def get_last_used(self, accessor: str) -> float | None:
        return self._last_used.get(accessor)

    def most_used(self, limit: int = 10) -> list[tuple[str, int]]:
        items = sorted(self._usage_counts.items(), key=lambda x: x[1], reverse=True)
        return items[:limit]

    def summary(self) -> dict[str, int]:
        return {
            "total_lookups": self._total_lookups,
            "total_renewals": self._total_renewals,
            "total_revocations": self._total_revocations,
            "unique_tokens_used": len(self._usage_counts),
        }
