"""Tests for nexusflow.api.serialization."""

import datetime
import decimal
import uuid
from enum import Enum

import pytest

from nexusflow.api.serialization import (
    FieldSerializer,
    ModelSerializer,
    SerializationError,
)


class Color(Enum):
    RED = "red"
    BLUE = "blue"


class SimpleModel:
    def __init__(self, name, age, active=True):
        self.name = name
        self.age = age
        self.active = active


class NestedModel:
    def __init__(self, title, author):
        self.title = title
        self.author = author  # SimpleModel


class SelfRefModel:
    def __init__(self, name, child=None):
        self.name = name
        self.child = child  # SelfRefModel or None


class TestFieldSerializer:
    """Tests for individual field serialization."""

    def test_auto_serialize_datetime(self):
        fs = FieldSerializer()
        dt = datetime.datetime(2025, 1, 15, 12, 0, 0)
        assert fs.serialize(dt) == dt.isoformat()

    def test_auto_serialize_uuid(self):
        fs = FieldSerializer()
        u = uuid.UUID("12345678-1234-5678-1234-567812345678")
        assert fs.serialize(u) == str(u)

    def test_auto_serialize_decimal(self):
        fs = FieldSerializer()
        d = decimal.Decimal("3.14")
        result = fs.serialize(d)
        assert isinstance(result, float)
        assert result == pytest.approx(3.14)

    def test_auto_serialize_enum(self):
        fs = FieldSerializer()
        assert fs.serialize(Color.RED) == "red"

    def test_auto_serialize_set(self):
        fs = FieldSerializer()
        result = fs.serialize({3, 1, 2})
        assert result == [1, 2, 3]

    def test_auto_serialize_bytes(self):
        fs = FieldSerializer()
        assert fs.serialize(b"hello") == "hello"

    def test_serialize_none_allowed(self):
        fs = FieldSerializer(allow_none=True)
        assert fs.serialize(None) is None

    def test_serialize_none_disallowed(self):
        fs = FieldSerializer(allow_none=False)
        with pytest.raises(SerializationError):
            fs.serialize(None)

    def test_custom_serializer(self):
        fs = FieldSerializer(serializer=lambda v: v.upper())
        assert fs.serialize("hello") == "HELLO"

    def test_deserialize_with_default(self):
        fs = FieldSerializer(required=False, default=42)
        assert fs.deserialize(None) == 42

    def test_deserialize_required_none_raises(self):
        fs = FieldSerializer(required=True, allow_none=False)
        with pytest.raises(SerializationError):
            fs.deserialize(None)


class TestModelSerializer:
    """Tests for model serialization."""

    def test_serialize_simple_model(self):
        ser = ModelSerializer()
        obj = SimpleModel("Alice", 30)
        result = ser.serialize(obj)
        assert result["name"] == "Alice"
        assert result["age"] == 30
        assert result["active"] is True

    def test_serialize_dict(self):
        ser = ModelSerializer()
        data = {"key": "value", "count": 5}
        result = ser.serialize(data)
        assert result["key"] == "value"

    def test_include_fields(self):
        ser = ModelSerializer(include={"name"})
        obj = SimpleModel("Alice", 30)
        result = ser.serialize(obj)
        assert "name" in result
        assert "age" not in result

    def test_exclude_fields(self):
        ser = ModelSerializer(exclude={"active"})
        obj = SimpleModel("Alice", 30)
        result = ser.serialize(obj)
        assert "active" not in result

    def test_write_only_field_excluded_from_output(self):
        ser = ModelSerializer(
            fields={"password": FieldSerializer(write_only=True)}
        )
        obj = {"name": "Alice", "password": "secret"}
        result = ser.serialize(obj)
        assert "password" not in result

    def test_field_target_rename(self):
        ser = ModelSerializer(
            fields={"name": FieldSerializer(target="full_name")}
        )
        obj = SimpleModel("Alice", 30)
        result = ser.serialize(obj)
        assert "full_name" in result
        assert result["full_name"] == "Alice"


class TestNestedSerialization:
    """Tests for nested model serialization."""

    def test_nested_model(self):
        author_ser = ModelSerializer()
        ser = ModelSerializer(nested_serializers={"author": author_ser})
        obj = NestedModel("My Post", SimpleModel("Bob", 25))
        result = ser.serialize(obj)
        assert result["author"]["name"] == "Bob"

    def test_nested_list(self):
        item_ser = ModelSerializer()
        ser = ModelSerializer(nested_serializers={"items": item_ser})
        obj = {"title": "List", "items": [
            SimpleModel("A", 1),
            SimpleModel("B", 2),
        ]}
        result = ser.serialize(obj)
        assert len(result["items"]) == 2
        assert result["items"][0]["name"] == "A"

    def test_nested_none(self):
        author_ser = ModelSerializer()
        ser = ModelSerializer(nested_serializers={"author": author_ser})
        obj = NestedModel("Post", None)
        result = ser.serialize(obj)
        assert result["author"] is None


class TestCircularReferences:
    """Tests for circular reference detection."""

    def test_circular_ref_detected(self):
        parent = SelfRefModel("parent")
        child = SelfRefModel("child", parent)
        parent.child = child
        ser = ModelSerializer(max_depth=10)
        result = ser.serialize(parent)
        # At some point a $ref should appear
        assert result["name"] == "parent"

    def test_max_depth_exceeded_raises(self):
        ser = ModelSerializer(max_depth=2)
        deep = {"level": 0}
        current = deep
        for i in range(1, 10):
            nested = type("Obj", (), {"level": i, "__dict__": {"level": i}})()
            current["child"] = nested
            current = nested.__dict__

        # The serializer should eventually raise
        with pytest.raises(SerializationError, match="depth"):
            ser.serialize(deep)


class TestSerializationHooks:
    """Tests for pre/post serialization hooks."""

    def test_pre_serialize_hook(self):
        ser = ModelSerializer()
        ser.pre_serialize(lambda obj: {**obj, "injected": True} if isinstance(obj, dict) else obj)
        result = ser.serialize({"key": "val"})
        assert result.get("injected") is True

    def test_post_serialize_hook(self):
        ser = ModelSerializer()
        ser.post_serialize(lambda d: {**d, "extra": "added"})
        result = ser.serialize({"key": "val"})
        assert result["extra"] == "added"
