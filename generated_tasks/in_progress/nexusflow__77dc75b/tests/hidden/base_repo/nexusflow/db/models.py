"""
nexusflow.db.models
~~~~~~~~~~~~~~~~~~~

ORM-like model definitions with field types, relationships, validation,
and serialization support. Provides a declarative API for defining database
models with automatic schema generation and data integrity enforcement.
"""

from __future__ import annotations

import copy
import datetime
import json
import uuid
from enum import Enum
from typing import (
    Any,
    Callable,
    Dict,
    Generic,
    List,
    Optional,
    Set,
    Tuple,
    Type,
    TypeVar,
    Union,
)

T = TypeVar("T")
ModelT = TypeVar("ModelT", bound="Model")


class FieldType(Enum):
    """Supported database field types."""
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    DATETIME = "datetime"
    DATE = "date"
    UUID = "uuid"
    JSON = "json"
    TEXT = "text"
    BINARY = "binary"
    ENUM = "enum"


class FieldConstraint:
    """Represents a constraint on a field value."""

    def __init__(
        self,
        name: str,
        check: Callable[[Any], bool],
        message: str = "",
    ) -> None:
        self.name = name
        self.check = check
        self.message = message or f"Constraint '{name}' violated"

    def validate(self, value: Any) -> bool:
        """Validate a value against this constraint."""
        if value is None:
            return True
        return self.check(value)

    def __repr__(self) -> str:
        return f"FieldConstraint(name={self.name!r})"


class Field:
    """Defines a single field on a model."""

    def __init__(
        self,
        field_type: FieldType,
        *,
        primary_key: bool = False,
        nullable: bool = True,
        default: Any = None,
        default_factory: Optional[Callable[[], Any]] = None,
        max_length: Optional[int] = None,
        min_length: Optional[int] = None,
        min_value: Optional[Union[int, float]] = None,
        max_value: Optional[Union[int, float]] = None,
        unique: bool = False,
        index: bool = False,
        choices: Optional[List[Any]] = None,
        validators: Optional[List[Callable[[Any], bool]]] = None,
        column_name: Optional[str] = None,
        doc: str = "",
    ) -> None:
        self.field_type = field_type
        self.primary_key = primary_key
        self.nullable = nullable
        self.default = default
        self.default_factory = default_factory
        self.max_length = max_length
        self.min_length = min_length
        self.min_value = min_value
        self.max_value = max_value
        self.unique = unique
        self.index = index
        self.choices = choices
        self.validators = validators or []
        self.column_name = column_name
        self.doc = doc
        self.name: str = ""
        self._constraints: List[FieldConstraint] = []
        self._build_constraints()

    def _build_constraints(self) -> None:
        """Build validation constraints from field properties."""
        if self.max_length is not None:
            self._constraints.append(
                FieldConstraint(
                    "max_length",
                    lambda v, ml=self.max_length: len(str(v)) <= ml,
                    f"Value exceeds max length of {self.max_length}",
                )
            )
        if self.min_length is not None:
            self._constraints.append(
                FieldConstraint(
                    "min_length",
                    lambda v, ml=self.min_length: len(str(v)) >= ml,
                    f"Value shorter than min length of {self.min_length}",
                )
            )
        if self.min_value is not None:
            self._constraints.append(
                FieldConstraint(
                    "min_value",
                    lambda v, mv=self.min_value: v >= mv,
                    f"Value less than minimum {self.min_value}",
                )
            )
        if self.max_value is not None:
            self._constraints.append(
                FieldConstraint(
                    "max_value",
                    lambda v, mv=self.max_value: v <= mv,
                    f"Value exceeds maximum {self.max_value}",
                )
            )
        if self.choices is not None:
            self._constraints.append(
                FieldConstraint(
                    "choices",
                    lambda v, c=self.choices: v in c,
                    f"Value not in allowed choices: {self.choices}",
                )
            )

    def get_default(self) -> Any:
        """Return the default value for this field."""
        if self.default_factory is not None:
            return self.default_factory()
        return copy.deepcopy(self.default)

    def validate(self, value: Any) -> List[str]:
        """Validate a value against all constraints. Returns list of error messages."""
        errors: List[str] = []
        if value is None:
            if not self.nullable and not self.primary_key:
                errors.append(f"Field '{self.name}' cannot be null")
            return errors

        for constraint in self._constraints:
            if not constraint.validate(value):
                errors.append(constraint.message)

        for validator_fn in self.validators:
            try:
                if not validator_fn(value):
                    errors.append(f"Custom validation failed for '{self.name}'")
            except Exception as e:
                errors.append(f"Validator error on '{self.name}': {e}")

        return errors

    def coerce(self, value: Any) -> Any:
        """Attempt to coerce a value to this field's type."""
        if value is None:
            return None
        type_coercions: Dict[FieldType, Callable] = {
            FieldType.STRING: str,
            FieldType.INTEGER: int,
            FieldType.FLOAT: float,
            FieldType.BOOLEAN: bool,
            FieldType.UUID: lambda v: v if isinstance(v, uuid.UUID) else uuid.UUID(str(v)),
            FieldType.JSON: lambda v: v if isinstance(v, (dict, list)) else json.loads(v),
        }
        coercion = type_coercions.get(self.field_type)
        if coercion:
            try:
                return coercion(value)
            except (ValueError, TypeError, json.JSONDecodeError):
                return value
        return value

    def to_schema(self) -> Dict[str, Any]:
        """Generate a schema dict for this field."""
        schema: Dict[str, Any] = {
            "type": self.field_type.value,
            "nullable": self.nullable,
            "primary_key": self.primary_key,
            "unique": self.unique,
            "index": self.index,
        }
        if self.max_length is not None:
            schema["max_length"] = self.max_length
        if self.choices is not None:
            schema["choices"] = self.choices
        if self.doc:
            schema["description"] = self.doc
        return schema

    def __repr__(self) -> str:
        return f"Field({self.field_type.value}, name={self.name!r})"


class Relationship:
    """Defines a relationship between two models."""

    def __init__(
        self,
        target_model: str,
        *,
        relationship_type: str = "many_to_one",
        back_populates: Optional[str] = None,
        foreign_key: Optional[str] = None,
        cascade: str = "save-update",
        lazy: str = "select",
    ) -> None:
        self.target_model = target_model
        self.relationship_type = relationship_type
        self.back_populates = back_populates
        self.foreign_key = foreign_key
        self.cascade = cascade
        self.lazy = lazy
        self.name: str = ""

    def __repr__(self) -> str:
        return (
            f"Relationship({self.target_model!r}, "
            f"type={self.relationship_type!r})"
        )


class ModelRegistry:
    """Global registry of all defined models."""

    _models: Dict[str, Type["Model"]] = {}
    _relationships: List[Tuple[str, str, Relationship]] = []

    @classmethod
    def register(cls, model_class: Type["Model"]) -> None:
        """Register a model class."""
        cls._models[model_class.__name__] = model_class

    @classmethod
    def get(cls, name: str) -> Optional[Type["Model"]]:
        """Get a model class by name."""
        return cls._models.get(name)

    @classmethod
    def all_models(cls) -> Dict[str, Type["Model"]]:
        """Return all registered models."""
        return dict(cls._models)

    @classmethod
    def add_relationship(
        cls, source: str, target: str, rel: Relationship
    ) -> None:
        cls._relationships.append((source, target, rel))

    @classmethod
    def clear(cls) -> None:
        """Clear the registry (for testing)."""
        cls._models.clear()
        cls._relationships.clear()

    @classmethod
    def get_schema(cls) -> Dict[str, Any]:
        """Generate schema for all registered models."""
        schema: Dict[str, Any] = {}
        for name, model_cls in cls._models.items():
            schema[name] = model_cls._generate_schema()
        return schema


class ModelMeta(type):
    """Metaclass for Model that collects field definitions."""

    def __new__(
        mcs,
        name: str,
        bases: Tuple[type, ...],
        namespace: Dict[str, Any],
    ) -> "ModelMeta":
        fields: Dict[str, Field] = {}
        relationships: Dict[str, Relationship] = {}

        for base in bases:
            if hasattr(base, "_fields"):
                fields.update(base._fields)
            if hasattr(base, "_relationships"):
                relationships.update(base._relationships)

        for key, value in namespace.items():
            if isinstance(value, Field):
                value.name = key
                fields[key] = value
            elif isinstance(value, Relationship):
                value.name = key
                relationships[key] = value

        namespace["_fields"] = fields
        namespace["_relationships"] = relationships
        namespace["_table_name"] = namespace.get(
            "_table_name", name.lower() + "s"
        )

        cls = super().__new__(mcs, name, bases, namespace)

        if name != "Model" and any(
            hasattr(b, "_fields") for b in bases
        ):
            ModelRegistry.register(cls)
            for rel_name, rel in relationships.items():
                ModelRegistry.add_relationship(name, rel.target_model, rel)

        return cls


class Model(metaclass=ModelMeta):
    """Base class for all ORM models."""

    _fields: Dict[str, Field] = {}
    _relationships: Dict[str, Relationship] = {}
    _table_name: str = ""

    def __init__(self, **kwargs: Any) -> None:
        self._data: Dict[str, Any] = {}
        self._dirty: Set[str] = set()
        self._loaded_relations: Dict[str, Any] = {}

        for field_name, field in self._fields.items():
            if field_name in kwargs:
                value = field.coerce(kwargs[field_name])
                self._data[field_name] = value
            else:
                self._data[field_name] = field.get_default()

        # Handle unknown kwargs
        for key in kwargs:
            if key not in self._fields and key not in self._relationships:
                raise ValueError(
                    f"Unknown field '{key}' for model {self.__class__.__name__}"
                )

    def __getattr__(self, name: str) -> Any:
        if name.startswith("_"):
            raise AttributeError(name)
        if name in self._fields:
            return self._data.get(name)
        if name in self._relationships:
            return self._loaded_relations.get(name)
        raise AttributeError(
            f"'{type(self).__name__}' has no attribute '{name}'"
        )

    def __setattr__(self, name: str, value: Any) -> None:
        if name.startswith("_"):
            super().__setattr__(name, value)
            return
        if name in self._fields:
            field = self._fields[name]
            coerced = field.coerce(value)
            self._data[name] = coerced
            self._dirty.add(name)
        else:
            super().__setattr__(name, value)

    def validate(self) -> List[str]:
        """Validate all fields. Returns list of error messages."""
        errors: List[str] = []
        for field_name, field in self._fields.items():
            value = self._data.get(field_name)
            field_errors = field.validate(value)
            errors.extend(field_errors)
        return errors

    def to_dict(self, include_relations: bool = False) -> Dict[str, Any]:
        """Serialize model to dictionary."""
        result: Dict[str, Any] = {}
        for field_name in self._fields:
            value = self._data.get(field_name)
            if isinstance(value, datetime.datetime):
                result[field_name] = value.isoformat()
            elif isinstance(value, datetime.date):
                result[field_name] = value.isoformat()
            elif isinstance(value, uuid.UUID):
                result[field_name] = str(value)
            elif isinstance(value, Enum):
                result[field_name] = value.value
            else:
                result[field_name] = value

        if include_relations:
            for rel_name, rel_data in self._loaded_relations.items():
                if isinstance(rel_data, list):
                    result[rel_name] = [
                        item.to_dict() if hasattr(item, "to_dict") else item
                        for item in rel_data
                    ]
                elif hasattr(rel_data, "to_dict"):
                    result[rel_name] = rel_data.to_dict()
                else:
                    result[rel_name] = rel_data
        return result

    @classmethod
    def from_dict(cls: Type[ModelT], data: Dict[str, Any]) -> ModelT:
        """Create a model instance from a dictionary."""
        filtered = {
            k: v for k, v in data.items() if k in cls._fields
        }
        return cls(**filtered)

    def get_dirty_fields(self) -> Dict[str, Any]:
        """Return only the fields that have been modified."""
        return {
            name: self._data[name]
            for name in self._dirty
            if name in self._data
        }

    def mark_clean(self) -> None:
        """Mark all fields as clean (not dirty)."""
        self._dirty.clear()

    @classmethod
    def _generate_schema(cls) -> Dict[str, Any]:
        """Generate the schema definition for this model."""
        return {
            "table": cls._table_name,
            "fields": {
                name: field.to_schema()
                for name, field in cls._fields.items()
            },
            "relationships": {
                name: {
                    "target": rel.target_model,
                    "type": rel.relationship_type,
                    "cascade": rel.cascade,
                }
                for name, rel in cls._relationships.items()
            },
        }

    def __repr__(self) -> str:
        pk_fields = [
            f for f in self._fields.values() if f.primary_key
        ]
        if pk_fields:
            pk_val = self._data.get(pk_fields[0].name)
            return f"<{type(self).__name__} pk={pk_val!r}>"
        return f"<{type(self).__name__}>"

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, type(self)):
            return NotImplemented
        return self._data == other._data

    def __hash__(self) -> int:
        pk_fields = [
            f for f in self._fields.values() if f.primary_key
        ]
        if pk_fields:
            pk_val = self._data.get(pk_fields[0].name)
            if pk_val is not None:
                return hash((type(self).__name__, pk_val))
        return id(self)
# Add batch operations
