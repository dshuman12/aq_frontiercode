"""Storage backend abstraction for FlowQ.

Allows swapping the persistence layer without changing worker or queue code.
"""

from flowq.backends.base import BaseBackend
from flowq.backends.memory_backend import MemoryBackend
from flowq.backends.sqlite_backend import SQLiteBackend

__all__ = ["BaseBackend", "MemoryBackend", "SQLiteBackend"]
