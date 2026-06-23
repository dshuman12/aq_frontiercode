"""Tests for flowq/serializers.py."""

import pytest
from flowq.models import Job, Priority
from flowq.serializers import (
    JSONSerializer, PickleSerializer, Base64Serializer, SerializerRegistry
)


@pytest.fixture(params=["json", "pickle", "base64"])
def serializer(request):
    return {"json": JSONSerializer(),
            "pickle": PickleSerializer(),
            "base64": Base64Serializer()}[request.param]


def test_round_trip(serializer):
    job = Job(name="test", payload={"key": "value"}, priority=Priority.HIGH)
    data = serializer.dumps(job)
    restored = serializer.loads(data)
    assert restored.id   == job.id
    assert restored.name == job.name
    assert restored.payload == job.payload


def test_dumps_returns_bytes(serializer):
    job = Job(name="x")
    assert isinstance(serializer.dumps(job), bytes)


def test_complex_payload_round_trip(serializer):
    payload = {"list": [1, 2, 3], "nested": {"a": True}}
    job = Job(name="x", payload=payload)
    restored = serializer.loads(serializer.dumps(job))
    assert restored.payload == payload


def test_registry_get_known(request):
    reg = SerializerRegistry()
    for name in ("json", "pickle", "base64"):
        assert reg.get(name) is not None


def test_registry_get_unknown_raises():
    reg = SerializerRegistry()
    with pytest.raises(KeyError):
        reg.get("msgpack")


def test_registry_register_custom():
    reg = SerializerRegistry()
    reg.register("custom", JSONSerializer())
    assert "custom" in reg.available()
