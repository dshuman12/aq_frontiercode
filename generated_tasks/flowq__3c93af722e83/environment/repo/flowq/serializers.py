"""Job serialization formats for FlowQ.

Supports JSON (default), and provides a pluggable interface for
custom serializers (e.g. MessagePack, Pickle for internal use).
"""

from __future__ import annotations

import base64
import json
import pickle
from abc import ABC, abstractmethod
from typing import Any, Dict

from flowq.models import Job


class BaseSerializer(ABC):
    """Serializer interface: Job <-> bytes."""

    @abstractmethod
    def dumps(self, job: Job) -> bytes:
        """Serialize *job* to bytes."""

    @abstractmethod
    def loads(self, data: bytes) -> Job:
        """Deserialize *data* to a Job."""

    def dumps_payload(self, payload: Dict[str, Any]) -> bytes:
        """Serialize an arbitrary payload dict."""
        return self.dumps(Job(name="_payload", payload=payload))

    def loads_payload(self, data: bytes) -> Dict[str, Any]:
        return self.loads(data).payload


class JSONSerializer(BaseSerializer):
    """Default serializer — human-readable, no external deps."""

    def dumps(self, job: Job) -> bytes:
        return json.dumps(job.to_dict(), default=str).encode("utf-8")

    def loads(self, data: bytes) -> Job:
        return Job.from_dict(json.loads(data.decode("utf-8")))

    def __repr__(self) -> str:
        return "JSONSerializer()"


class PickleSerializer(BaseSerializer):
    """Pickle-based serializer — supports arbitrary Python objects in payload.

    Warning: Only use between trusted processes. Never deserialize
    pickle data from untrusted sources.
    """

    def __init__(self, protocol: int = pickle.HIGHEST_PROTOCOL):
        self._protocol = protocol

    def dumps(self, job: Job) -> bytes:
        return pickle.dumps(job.to_dict(), protocol=self._protocol)

    def loads(self, data: bytes) -> Job:
        return Job.from_dict(pickle.loads(data))

    def __repr__(self) -> str:
        return f"PickleSerializer(protocol={self._protocol})"


class Base64Serializer(BaseSerializer):
    """Wraps another serializer and base64-encodes the output.

    Useful when the transport layer requires text-safe content.
    """

    def __init__(self, inner: BaseSerializer = None):
        self._inner = inner or JSONSerializer()

    def dumps(self, job: Job) -> bytes:
        raw = self._inner.dumps(job)
        return base64.b64encode(raw)

    def loads(self, data: bytes) -> Job:
        raw = base64.b64decode(data)
        return self._inner.loads(raw)

    def __repr__(self) -> str:
        return f"Base64Serializer(inner={self._inner})"


class SerializerRegistry:
    """Registry of named serializers."""

    def __init__(self):
        self._registry: Dict[str, BaseSerializer] = {
            "json":   JSONSerializer(),
            "pickle": PickleSerializer(),
            "base64": Base64Serializer(),
        }

    def register(self, name: str, serializer: BaseSerializer) -> None:
        self._registry[name] = serializer

    def get(self, name: str) -> BaseSerializer:
        if name not in self._registry:
            raise KeyError(f"Unknown serializer: {name!r}. "
                           f"Available: {list(self._registry)}")
        return self._registry[name]

    def available(self):
        return list(self._registry.keys())


serializer_registry = SerializerRegistry()
default_serializer  = JSONSerializer()
