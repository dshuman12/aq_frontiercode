"""Specialized collection types for VaultKey."""
from __future__ import annotations

import threading
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Generic, Iterator, TypeVar

T = TypeVar("T")
V = TypeVar("V")


class TTLMap(Generic[T]):
    """A dictionary where entries expire after a configurable TTL."""

    def __init__(self, default_ttl: float = 300.0, clock: Any = None) -> None:
        self._data: dict[str, tuple[T, float, float]] = {}
        self._default_ttl = default_ttl
        self._clock = clock or time.monotonic
        self._lock = threading.Lock()

    def put(self, key: str, value: T, ttl: float | None = None) -> None:
        """Store a value with optional custom TTL."""
        effective_ttl = ttl if ttl is not None else self._default_ttl
        with self._lock:
            self._data[key] = (value, self._clock(), effective_ttl)

    def get(self, key: str, default: T | None = None) -> T | None:
        """Retrieve a value if it hasn't expired."""
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return default
            value, created, ttl = entry
            if ttl > 0 and (self._clock() - created) >= ttl:
                del self._data[key]
                return default
            return value

    def delete(self, key: str) -> bool:
        """Remove an entry, return True if it existed."""
        with self._lock:
            return self._data.pop(key, None) is not None

    def contains(self, key: str) -> bool:
        return self.get(key) is not None

    def keys(self) -> list[str]:
        """Return non-expired keys."""
        now = self._clock()
        with self._lock:
            result = []
            expired = []
            for k, (_, created, ttl) in self._data.items():
                if ttl > 0 and (now - created) >= ttl:
                    expired.append(k)
                else:
                    result.append(k)
            for k in expired:
                del self._data[k]
            return result

    def values(self) -> list[T]:
        """Return non-expired values."""
        now = self._clock()
        with self._lock:
            result: list[T] = []
            expired: list[str] = []
            for k, (v, created, ttl) in self._data.items():
                if ttl > 0 and (now - created) >= ttl:
                    expired.append(k)
                else:
                    result.append(v)
            for k in expired:
                del self._data[k]
            return result

    def items(self) -> list[tuple[str, T]]:
        """Return non-expired (key, value) pairs."""
        now = self._clock()
        with self._lock:
            result: list[tuple[str, T]] = []
            expired: list[str] = []
            for k, (v, created, ttl) in self._data.items():
                if ttl > 0 and (now - created) >= ttl:
                    expired.append(k)
                else:
                    result.append((k, v))
            for k in expired:
                del self._data[k]
            return result

    def size(self) -> int:
        return len(self.keys())

    def clear(self) -> None:
        with self._lock:
            self._data.clear()

    def cleanup(self) -> int:
        """Remove all expired entries, return count removed."""
        now = self._clock()
        with self._lock:
            expired = [
                k for k, (_, created, ttl) in self._data.items()
                if ttl > 0 and (now - created) >= ttl
            ]
            for k in expired:
                del self._data[k]
            return len(expired)

    def touch(self, key: str) -> bool:
        """Reset the TTL timer for an existing entry."""
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return False
            value, _, ttl = entry
            self._data[key] = (value, self._clock(), ttl)
            return True


class BoundedQueue(Generic[T]):
    """Thread-safe bounded FIFO queue that drops oldest on overflow."""

    def __init__(self, max_size: int = 1000) -> None:
        if max_size <= 0:
            raise ValueError("max_size must be positive")
        self._max_size = max_size
        self._items: list[T] = []
        self._lock = threading.Lock()

    def push(self, item: T) -> T | None:
        """Add item, return evicted item if queue was full."""
        with self._lock:
            evicted: T | None = None
            if len(self._items) >= self._max_size:
                evicted = self._items.pop(0)
            self._items.append(item)
            return evicted

    def pop(self) -> T | None:
        """Remove and return the oldest item."""
        with self._lock:
            if not self._items:
                return None
            return self._items.pop(0)

    def peek(self) -> T | None:
        """Return the oldest item without removing it."""
        with self._lock:
            return self._items[0] if self._items else None

    def peek_newest(self) -> T | None:
        with self._lock:
            return self._items[-1] if self._items else None

    def drain(self) -> list[T]:
        """Remove and return all items."""
        with self._lock:
            items = list(self._items)
            self._items.clear()
            return items

    def to_list(self) -> list[T]:
        with self._lock:
            return list(self._items)

    def size(self) -> int:
        with self._lock:
            return len(self._items)

    def is_empty(self) -> bool:
        return self.size() == 0

    def is_full(self) -> bool:
        with self._lock:
            return len(self._items) >= self._max_size

    @property
    def max_size(self) -> int:
        return self._max_size

    def clear(self) -> None:
        with self._lock:
            self._items.clear()


@dataclass(frozen=True)
class ImmutableConfig:
    """Immutable configuration container with dot-access and merging."""

    _data: dict[str, Any] = field(default_factory=dict)

    def get(self, key: str, default: Any = None) -> Any:
        parts = key.split(".")
        current: Any = self._data
        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
                if current is None:
                    return default
            else:
                return default
        return current

    def keys(self) -> list[str]:
        return list(self._data.keys())

    def values(self) -> list[Any]:
        return list(self._data.values())

    def items(self) -> list[tuple[str, Any]]:
        return list(self._data.items())

    def merge(self, other: dict[str, Any]) -> ImmutableConfig:
        """Return a new config with other's values merged in."""
        merged = _deep_merge(dict(self._data), other)
        return ImmutableConfig(_data=merged)

    def to_dict(self) -> dict[str, Any]:
        return dict(self._data)

    def contains(self, key: str) -> bool:
        return self.get(key) is not None

    def __len__(self) -> int:
        return len(self._data)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, ImmutableConfig):
            return self._data == other._data
        return NotImplemented


def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    result = dict(base)
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result


class LRUCache(Generic[V]):
    """Least-recently-used cache with configurable max size."""

    def __init__(self, max_size: int = 128) -> None:
        if max_size <= 0:
            raise ValueError("max_size must be positive")
        self._max_size = max_size
        self._data: OrderedDict[str, V] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> V | None:
        with self._lock:
            if key in self._data:
                self._data.move_to_end(key)
                return self._data[key]
            return None

    def put(self, key: str, value: V) -> str | None:
        """Insert/update entry. Returns evicted key if cache was full."""
        with self._lock:
            if key in self._data:
                self._data.move_to_end(key)
                self._data[key] = value
                return None
            evicted_key: str | None = None
            if len(self._data) >= self._max_size:
                evicted_key, _ = self._data.popitem(last=False)
            self._data[key] = value
            return evicted_key

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._data:
                del self._data[key]
                return True
            return False

    def contains(self, key: str) -> bool:
        with self._lock:
            return key in self._data

    def size(self) -> int:
        with self._lock:
            return len(self._data)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()

    def keys(self) -> list[str]:
        with self._lock:
            return list(self._data.keys())


class PriorityQueue(Generic[T]):
    """Min-heap priority queue."""

    def __init__(self) -> None:
        self._heap: list[tuple[float, int, T]] = []
        self._counter = 0
        self._lock = threading.Lock()

    def push(self, item: T, priority: float = 0.0) -> None:
        """Add an item with the given priority (lower = higher priority)."""
        with self._lock:
            import heapq
            heapq.heappush(self._heap, (priority, self._counter, item))
            self._counter += 1

    def pop(self) -> T | None:
        """Remove and return the highest-priority item."""
        with self._lock:
            if not self._heap:
                return None
            import heapq
            _, _, item = heapq.heappop(self._heap)
            return item

    def peek(self) -> T | None:
        """Return the highest-priority item without removing it."""
        with self._lock:
            if not self._heap:
                return None
            return self._heap[0][2]

    def size(self) -> int:
        with self._lock:
            return len(self._heap)

    def is_empty(self) -> bool:
        return self.size() == 0

    def clear(self) -> None:
        with self._lock:
            self._heap.clear()

    def drain(self) -> list[T]:
        """Remove and return all items in priority order."""
        with self._lock:
            import heapq
            result: list[T] = []
            while self._heap:
                _, _, item = heapq.heappop(self._heap)
                result.append(item)
            return result


class RingBuffer(Generic[T]):
    """Fixed-size circular buffer."""

    def __init__(self, capacity: int) -> None:
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self._capacity = capacity
        self._buffer: list[T | None] = [None] * capacity
        self._head = 0
        self._tail = 0
        self._size = 0
        self._lock = threading.Lock()

    def append(self, item: T) -> T | None:
        """Append an item. Returns evicted item if buffer was full."""
        with self._lock:
            evicted: T | None = None
            if self._size == self._capacity:
                evicted = self._buffer[self._head]
                self._head = (self._head + 1) % self._capacity
            else:
                self._size += 1
            self._buffer[self._tail] = item
            self._tail = (self._tail + 1) % self._capacity
            return evicted

    def get(self, index: int) -> T | None:
        """Get item at logical index (0 = oldest)."""
        with self._lock:
            if index < 0 or index >= self._size:
                return None
            actual = (self._head + index) % self._capacity
            return self._buffer[actual]

    def to_list(self) -> list[T]:
        """Return all items from oldest to newest."""
        with self._lock:
            result: list[T] = []
            for i in range(self._size):
                actual = (self._head + i) % self._capacity
                item = self._buffer[actual]
                if item is not None:
                    result.append(item)
            return result

    @property
    def capacity(self) -> int:
        return self._capacity

    def size(self) -> int:
        with self._lock:
            return self._size

    def is_full(self) -> bool:
        with self._lock:
            return self._size == self._capacity

    def is_empty(self) -> bool:
        return self.size() == 0

    def clear(self) -> None:
        with self._lock:
            self._buffer = [None] * self._capacity
            self._head = self._tail = self._size = 0


class ConsistentHashRing:
    """Consistent hash ring for distributed key mapping."""

    def __init__(self, replicas: int = 100) -> None:
        self._replicas = replicas
        self._ring: dict[int, str] = {}
        self._sorted_keys: list[int] = []
        self._nodes: set[str] = set()

    def add_node(self, node: str) -> None:
        """Add a node to the ring."""
        self._nodes.add(node)
        import hashlib
        for i in range(self._replicas):
            key = int(hashlib.md5(f"{node}:{i}".encode()).hexdigest(), 16)
            self._ring[key] = node
        self._sorted_keys = sorted(self._ring.keys())

    def remove_node(self, node: str) -> None:
        """Remove a node from the ring."""
        self._nodes.discard(node)
        import hashlib
        for i in range(self._replicas):
            key = int(hashlib.md5(f"{node}:{i}".encode()).hexdigest(), 16)
            self._ring.pop(key, None)
        self._sorted_keys = sorted(self._ring.keys())

    def get_node(self, key: str) -> str | None:
        """Get the node responsible for the given key."""
        if not self._ring:
            return None
        import hashlib
        hash_val = int(hashlib.md5(key.encode()).hexdigest(), 16)
        import bisect
        idx = bisect.bisect_right(self._sorted_keys, hash_val)
        if idx >= len(self._sorted_keys):
            idx = 0
        return self._ring[self._sorted_keys[idx]]

    def get_nodes(self, key: str, count: int = 1) -> list[str]:
        """Get multiple nodes for a key (for replication)."""
        if not self._ring:
            return []
        import hashlib
        import bisect
        hash_val = int(hashlib.md5(key.encode()).hexdigest(), 16)
        idx = bisect.bisect_right(self._sorted_keys, hash_val)
        result: list[str] = []
        seen: set[str] = set()
        for i in range(len(self._sorted_keys)):
            real_idx = (idx + i) % len(self._sorted_keys)
            node = self._ring[self._sorted_keys[real_idx]]
            if node not in seen:
                seen.add(node)
                result.append(node)
                if len(result) >= count:
                    break
        return result

    @property
    def node_count(self) -> int:
        return len(self._nodes)

    def list_nodes(self) -> list[str]:
        return sorted(self._nodes)


class BloomFilter:
    """Probabilistic set membership test with no false negatives."""

    def __init__(self, expected_items: int = 1000, false_positive_rate: float = 0.01) -> None:
        import math
        self._size = max(int(-expected_items * math.log(false_positive_rate) / (math.log(2) ** 2)), 64)
        self._num_hashes = max(int((self._size / max(expected_items, 1)) * math.log(2)), 1)
        self._bits = bytearray(self._size // 8 + 1)
        self._count = 0

    def add(self, item: str) -> None:
        """Add an item to the filter."""
        for i in range(self._num_hashes):
            idx = self._hash(item, i) % self._size
            self._bits[idx // 8] |= 1 << (idx % 8)
        self._count += 1

    def might_contain(self, item: str) -> bool:
        """Check if an item might be in the set."""
        for i in range(self._num_hashes):
            idx = self._hash(item, i) % self._size
            if not (self._bits[idx // 8] & (1 << (idx % 8))):
                return False
        return True

    def _hash(self, item: str, seed: int) -> int:
        import hashlib
        data = f"{seed}:{item}".encode()
        return int(hashlib.md5(data).hexdigest(), 16)

    @property
    def count(self) -> int:
        return self._count

    @property
    def size_bytes(self) -> int:
        return len(self._bits)


class Trie:
    """Prefix tree for efficient string storage and lookup."""

    def __init__(self) -> None:
        self._children: dict[str, Trie] = {}
        self._is_terminal: bool = False
        self._value: Any = None
        self._size = 0

    def insert(self, key: str, value: Any = None) -> None:
        """Insert a key into the trie."""
        node = self
        for char in key:
            if char not in node._children:
                node._children[char] = Trie()
            node = node._children[char]
        if not node._is_terminal:
            self._size += 1
        node._is_terminal = True
        node._value = value

    def search(self, key: str) -> Any | None:
        """Search for an exact key."""
        node = self._find_node(key)
        if node and node._is_terminal:
            return node._value
        return None

    def starts_with(self, prefix: str) -> list[str]:
        """Find all keys with the given prefix."""
        node = self._find_node(prefix)
        if node is None:
            return []
        results: list[str] = []
        self._collect(node, prefix, results)
        return results

    def contains(self, key: str) -> bool:
        node = self._find_node(key)
        return node is not None and node._is_terminal

    def remove(self, key: str) -> bool:
        """Remove a key from the trie."""
        node = self._find_node(key)
        if node and node._is_terminal:
            node._is_terminal = False
            node._value = None
            self._size -= 1
            return True
        return False

    def _find_node(self, key: str) -> Trie | None:
        node = self
        for char in key:
            node = node._children.get(char)
            if node is None:
                return None
        return node

    def _collect(self, node: Trie, prefix: str, results: list[str]) -> None:
        if node._is_terminal:
            results.append(prefix)
        for char, child in sorted(node._children.items()):
            self._collect(child, prefix + char, results)

    @property
    def size(self) -> int:
        return self._size

    def is_empty(self) -> bool:
        return self._size == 0
