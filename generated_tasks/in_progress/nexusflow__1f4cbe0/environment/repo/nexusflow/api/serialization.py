"""
nexusflow.api.serialization
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Custom serializer with nested model support, type coercion, field
inclusion/exclusion, and circular reference detection. Supports
multiple output formats and custom serialization hooks.
"""

from __future__ import annotations

import copy
import datetime
import decimal
import json
import uuid
from enum import Enum
from typing import (
    Any,
    Callable,
    Dict,
    FrozenSet,
    List,
    Optional,
    Set,
    Tuple,
    Type,
    Union,
)


class SerializationError(Exception):
    """Raised when serialization fails."""
    pass


class FieldSerializer:
    """Serializer for a single field with type coercion."""

    def __init__(
        self,
        source: Optional[str] = None,
        target: Optional[str] = None,
        serializer: Optional[Callable[[Any], Any]] = None,
        deserializer: Optional[Callable[[Any], Any]] = None,
        read_only: bool = False,
        write_only: bool = False,
        required: bool = True,
        default: Any = None,
        allow_none: bool = True,
    ) -> None:
        self.source = source
        self.target = target
        self.serializer = serializer
        self.deserializer = deserializer
        self.read_only = read_only
        self.write_only = write_only
        self.required = required
        self.default = default
        self.allow_none = allow_none

    def serialize(self, value: Any) -> Any:
        """Serialize a value using the field's serializer."""
        if value is None:
            if not self.allow_none:
                raise SerializationError("None not allowed for this field")
            return None
        if self.serializer:
            return self.serializer(value)
        return self._auto_serialize(value)

    def deserialize(self, value: Any) -> Any:
        """Deserialize a value using the field's deserializer."""
        if value is None:
            if not self.allow_none and self.required:
                raise SerializationError("None not allowed for required field")
            return self.default
        if self.deserializer:
            return self.deserializer(value)
        return value

    @staticmethod
    def _auto_serialize(value: Any) -> Any:
        """Auto-serialize common Python types."""
        if isinstance(value, datetime.datetime):
            return value.isoformat()
        if isinstance(value, datetime.date):
            return value.isoformat()
        if isinstance(value, datetime.time):
            return value.isoformat()
        if isinstance(value, uuid.UUID):
            return str(value)
        if isinstance(value, decimal.Decimal):
            return float(value)
        if isinstance(value, bytes):
            return value.decode("utf-8", errors="replace")
        if isinstance(value, Enum):
            return value.value
        if isinstance(value, set):
            return sorted(list(value), key=str)
        if isinstance(value, frozenset):
            return sorted(list(value), key=str)
        return value


class ModelSerializer:
    """
    Serializer for model objects with nested model support.

    Handles circular references via depth tracking, field inclusion/
    exclusion, and recursive nested serialization.
    """

    def __init__(
        self,
        fields: Optional[Dict[str, FieldSerializer]] = None,
        include: Optional[Set[str]] = None,
        exclude: Optional[Set[str]] = None,
        max_depth: int = 10,
        nested_serializers: Optional[Dict[str, "ModelSerializer"]] = None,
    ) -> None:
        self._fields = fields or {}
        self._include = include
        self._exclude = exclude or set()
        self._max_depth = max_depth
        self._nested_serializers = nested_serializers or {}
        self._pre_serialize_hooks: List[Callable[[Any], Any]] = []
        self._post_serialize_hooks: List[Callable[[Dict], Dict]] = []

    def add_field(self, name: str, serializer: FieldSerializer) -> None:
        """Add a field serializer."""
        self._fields[name] = serializer

    def add_nested(self, name: str, serializer: "ModelSerializer") -> None:
        """Add a nested model serializer."""
        self._nested_serializers[name] = serializer

    def pre_serialize(self, hook: Callable[[Any], Any]) -> None:
        """Register a pre-serialization hook."""
        self._pre_serialize_hooks.append(hook)

    def post_serialize(self, hook: Callable[[Dict], Dict]) -> None:
        """Register a post-serialization hook."""
        self._post_serialize_hooks.append(hook)

    def serialize(
        self,
        obj: Any,
        depth: int = 0,
        seen: Optional[Set[int]] = None,
    ) -> Dict[str, Any]:
        """
        Serialize a model object to a dictionary.
        """
        if seen is None:
            seen = set()

        if depth > self._max_depth:
            raise SerializationError(
                f"Max serialization depth ({self._max_depth}) exceeded"
            )

        obj_id = id(obj)
        if obj_id in seen:
            return {"$ref": f"circular_ref_{obj_id}"}
        seen.add(obj_id)

        # Run pre-serialize hooks
        for hook in self._pre_serialize_hooks:
            obj = hook(obj)

        result: Dict[str, Any] = {}

        # Get object data
        if hasattr(obj, "to_dict"):
            data = obj.to_dict()
        elif hasattr(obj, "__dict__"):
            data = {
                k: v for k, v in obj.__dict__.items()
                if not k.startswith("_")
            }
        elif isinstance(obj, dict):
            data = obj
        else:
            raise SerializationError(
                f"Cannot serialize object of type {type(obj).__name__}"
            )

        # Apply field inclusion/exclusion
        field_names = set(data.keys())
        if self._include is not None:
            field_names &= self._include
        field_names -= self._exclude

        for name in field_names:
            value = data.get(name)

            # Check for nested serializer
            if name in self._nested_serializers:
                nested = self._nested_serializers[name]
                if isinstance(value, list):
                    result[name] = [
                        nested.serialize(item, depth + 1, seen.copy())
                        for item in value
                    ]
                elif value is not None:
                    result[name] = nested.serialize(
                        value, depth + 1, seen.copy()
                    )
                else:
                    result[name] = None
                continue

            # Check for field-specific serializer
            if name in self._fields:
                field_ser = self._fields[name]
                if field_ser.write_only:
                    continue
                target = field_ser.target or name
                result[target] = field_ser.serialize(value)
            else:
                result[name] = self._auto_serialize_value(value, depth, seen)

        # Run post-serialize hooks
        for hook in self._post_serialize_hooks:
            result = hook(result)

        seen.discard(obj_id)
        return result

    def _auto_serialize_value(
        self, value: Any, depth: int, seen: Set[int]
    ) -> Any:
        """Auto-serialize a value based on its type."""
        if value is None:
            return None
        if isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, datetime.datetime):
            return value.isoformat()
        if isinstance(value, datetime.date):
            return value.isoformat()
        if isinstance(value, uuid.UUID):
            return str(value)
        if isinstance(value, decimal.Decimal):
            return float(value)
        if isinstance(value, Enum):
            return value.value
        if isinstance(value, bytes):
            return value.decode("utf-8", errors="replace")
        if isinstance(value, (list, tuple)):
            return [
                self._auto_serialize_value(item, depth, seen)
                for item in value
            ]
        if isinstance(value, dict):
            return {
                str(k): self._auto_serialize_value(v, depth, seen)
                for k, v in value.items()
            }
        if isinstance(value, set):
            return sorted(
                [self._auto_serialize_value(item, depth, seen) for item in value],
                key=str,
            )
        # Complex objects — attempt nested serialization
        if hasattr(value, "__dict__"):
            obj_id = id(value)
            if obj_id in seen:
                return {"$ref": f"circular_ref_{obj_id}"}
            return self.serialize(value, depth + 1, seen.copy())
        return str(value)

    def deserialize(
        self,
        data: Dict[str, Any],
        target_class: Optional[Type] = None,
    ) -> Any:
        """Deserialize a dictionary back to a model or dict."""
        result: Dict[str, Any] = {}

        for name, value in data.items():
            # Check for field-specific deserializer
            if name in self._fields:
                field_ser = self._fields[name]
                if field_ser.read_only:
                    continue
                source = field_ser.source or name
                result[source] = field_ser.deserialize(value)
            elif name in self._nested_serializers:
                nested = self._nested_serializers[name]
                if isinstance(value, list):
                    result[name] = [
                        nested.deserialize(item)
                        for item in value
                    ]
                elif isinstance(value, dict):
                    result[name] = nested.deserialize(value)
                else:
                    result[name] = value
            else:
                result[name] = value

        if target_class is not None:
            try:
                return target_class(**result)
            except Exception as e:
                raise SerializationError(
                    f"Failed to instantiate {target_class.__name__}: {e}"
                )

        return result


class CollectionSerializer:
    """Serializes collections of models with pagination metadata."""

    def __init__(
        self,
        item_serializer: ModelSerializer,
        envelope: str = "data",
    ) -> None:
        self._item_serializer = item_serializer
        self._envelope = envelope

    def serialize(
        self,
        items: List[Any],
        total: Optional[int] = None,
        page: Optional[int] = None,
        page_size: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Serialize a collection of items."""
        serialized = [
            self._item_serializer.serialize(item)
            for item in items
        ]

        result: Dict[str, Any] = {
            self._envelope: serialized,
            "count": len(serialized),
        }

        if total is not None:
            result["total"] = total
        if page is not None:
            result["page"] = page
        if page_size is not None:
            result["page_size"] = page_size
            if total is not None:
                result["total_pages"] = (total + page_size - 1) // page_size

        return result


class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles common Python types."""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        if isinstance(obj, datetime.date):
            return obj.isoformat()
        if isinstance(obj, datetime.time):
            return obj.isoformat()
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, bytes):
            return obj.decode("utf-8", errors="replace")
        if isinstance(obj, set):
            return sorted(list(obj), key=str)
        if isinstance(obj, Enum):
            return obj.value
        if hasattr(obj, "to_dict"):
            return obj.to_dict()
        return super().default(obj)


def serialize_to_json(
    data: Any,
    pretty: bool = False,
    serializer: Optional[ModelSerializer] = None,
) -> str:
    """Serialize data to JSON string."""
    if serializer and not isinstance(data, (str, int, float, bool, type(None))):
        data = serializer.serialize(data)
    indent = 2 if pretty else None
    return json.dumps(data, cls=JSONEncoder, indent=indent, ensure_ascii=False)


def deserialize_from_json(
    json_str: str,
    serializer: Optional[ModelSerializer] = None,
    target_class: Optional[Type] = None,
) -> Any:
    """Deserialize a JSON string."""
    data = json.loads(json_str)
    if serializer and isinstance(data, dict):
        return serializer.deserialize(data, target_class)
    return data
