"""
nexusflow.events.replay
~~~~~~~~~~~~~~~~~~~~~~~~

Event replay and event sourcing for audit trails and state
reconstruction. Supports filtering, time-range queries, and
replay with transformation.
"""

from __future__ import annotations

import copy
import json
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set, Tuple


@dataclass
class StoredEvent:
    """An event stored for replay purposes."""
    event_id: str
    event_type: str
    payload: Dict[str, Any]
    timestamp: float
    source: str = ""
    sequence: int = 0
    transaction_id: Optional[str] = None
    rolled_back: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "payload": self.payload,
            "timestamp": self.timestamp,
            "source": self.source,
            "sequence": self.sequence,
            "transaction_id": self.transaction_id,
            "rolled_back": self.rolled_back,
            "metadata": self.metadata,
        }


class EventStore:
    """
    Persistent store for events with replay capabilities.
    """

    def __init__(self) -> None:
        self._events: List[StoredEvent] = []
        self._sequence: int = 0
        self._type_index: Dict[str, List[int]] = defaultdict(list)
        self._source_index: Dict[str, List[int]] = defaultdict(list)
        self._transaction_index: Dict[str, List[int]] = defaultdict(list)
        self._rolled_back_transactions: Set[str] = set()
        self._snapshots: Dict[str, Dict[str, Any]] = {}

    def append(
        self,
        event_id: str,
        event_type: str,
        payload: Dict[str, Any],
        source: str = "",
        transaction_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> StoredEvent:
        """Append an event to the store."""
        self._sequence += 1
        stored = StoredEvent(
            event_id=event_id,
            event_type=event_type,
            payload=payload,
            timestamp=time.time(),
            source=source,
            sequence=self._sequence,
            transaction_id=transaction_id,
            metadata=metadata or {},
        )
        idx = len(self._events)
        self._events.append(stored)
        self._type_index[event_type].append(idx)
        if source:
            self._source_index[source].append(idx)
        if transaction_id:
            self._transaction_index[transaction_id].append(idx)
        return stored

    def mark_transaction_rolled_back(self, transaction_id: str) -> None:
        """
        Mark a transaction as rolled back.
        """
        self._rolled_back_transactions.add(transaction_id)

    def get_events(
        self,
        event_type: Optional[str] = None,
        source: Optional[str] = None,
        after: Optional[float] = None,
        before: Optional[float] = None,
        limit: Optional[int] = None,
        exclude_rolled_back: bool = True,
    ) -> List[StoredEvent]:
        """Query events with optional filters."""
        if event_type:
            indices = self._type_index.get(event_type, [])
            candidates = [self._events[i] for i in indices]
        elif source:
            indices = self._source_index.get(source, [])
            candidates = [self._events[i] for i in indices]
        else:
            candidates = list(self._events)

        result = []
        for event in candidates:
            if after and event.timestamp < after:
                continue
            if before and event.timestamp > before:
                continue
            if exclude_rolled_back and event.rolled_back:
                continue
            result.append(event)

        if limit:
            result = result[:limit]

        return result

    def replay(
        self,
        handler: Callable[[StoredEvent], None],
        event_type: Optional[str] = None,
        after_sequence: int = 0,
        transform: Optional[Callable[[StoredEvent], StoredEvent]] = None,
    ) -> int:
        """
        Replay events through a handler.
        """
        count = 0
        for event in self._events:
            if event.sequence <= after_sequence:
                continue
            if event_type and event.event_type != event_type:
                continue
            if event.rolled_back:
                continue

            if transform:
                event = transform(copy.deepcopy(event))

            handler(event)
            count += 1

        return count

    def create_snapshot(self, name: str, state: Dict[str, Any]) -> None:
        """Create a named snapshot of the current state."""
        self._snapshots[name] = {
            "state": copy.deepcopy(state),
            "sequence": self._sequence,
            "timestamp": time.time(),
            "event_count": len(self._events),
        }

    def get_snapshot(self, name: str) -> Optional[Dict[str, Any]]:
        """Retrieve a snapshot by name."""
        return self._snapshots.get(name)

    def get_events_since_snapshot(self, name: str) -> List[StoredEvent]:
        """Get all events recorded after a snapshot."""
        snapshot = self._snapshots.get(name)
        if not snapshot:
            return []
        seq = snapshot["sequence"]
        return [e for e in self._events if e.sequence > seq]

    def count(self) -> int:
        """Return total number of stored events."""
        return len(self._events)

    def get_event_types(self) -> Set[str]:
        """Return all unique event types."""
        return set(self._type_index.keys())

    def clear(self) -> None:
        """Clear all stored events."""
        self._events.clear()
        self._sequence = 0
        self._type_index.clear()
        self._source_index.clear()
        self._transaction_index.clear()
        self._rolled_back_transactions.clear()
        self._snapshots.clear()

    def to_json(self, pretty: bool = False) -> str:
        """Export all events as JSON."""
        events = [e.to_dict() for e in self._events]
        indent = 2 if pretty else None
        return json.dumps(events, indent=indent, default=str)

    def from_json(self, data: str) -> int:
        """Import events from JSON."""
        events = json.loads(data)
        count = 0
        for event_data in events:
            self.append(
                event_id=event_data["event_id"],
                event_type=event_data["event_type"],
                payload=event_data["payload"],
                source=event_data.get("source", ""),
                transaction_id=event_data.get("transaction_id"),
                metadata=event_data.get("metadata", {}),
            )
            count += 1
        return count
