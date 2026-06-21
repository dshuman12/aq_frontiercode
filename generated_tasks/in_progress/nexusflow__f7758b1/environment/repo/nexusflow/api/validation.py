"""
nexusflow.api.validation
~~~~~~~~~~~~~~~~~~~~~~~~

Request validation and type coercion framework. Supports schema-based
validation, nested object validation, custom validators, and detailed
error reporting.
"""

from __future__ import annotations

import re
from enum import Enum
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Optional,
    Set,
    Tuple,
    Type,
    Union,
)


class ValidationErrorLevel(Enum):
    """Severity levels for validation errors."""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class ValidationError:
    """Represents a single validation error."""

    def __init__(
        self,
        field: str,
        message: str,
        code: str = "invalid",
        level: ValidationErrorLevel = ValidationErrorLevel.ERROR,
        value: Any = None,
    ) -> None:
        self.field = field
        self.message = message
        self.code = code
        self.level = level
        self.value = value

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "field": self.field,
            "message": self.message,
            "code": self.code,
        }
        if self.level != ValidationErrorLevel.ERROR:
            result["level"] = self.level.value
        return result

    def __repr__(self) -> str:
        return f"ValidationError({self.field!r}: {self.message!r})"


class ValidationResult:
    """Collects validation results."""

    def __init__(self) -> None:
        self._errors: List[ValidationError] = []
        self._warnings: List[ValidationError] = []
        self._cleaned_data: Dict[str, Any] = {}

    def add_error(
        self,
        field: str,
        message: str,
        code: str = "invalid",
        value: Any = None,
    ) -> None:
        self._errors.append(
            ValidationError(field, message, code, ValidationErrorLevel.ERROR, value)
        )

    def add_warning(
        self,
        field: str,
        message: str,
        code: str = "warning",
    ) -> None:
        self._warnings.append(
            ValidationError(field, message, code, ValidationErrorLevel.WARNING)
        )

    def set_value(self, field: str, value: Any) -> None:
        self._cleaned_data[field] = value

    @property
    def is_valid(self) -> bool:
        return len(self._errors) == 0

    @property
    def errors(self) -> List[ValidationError]:
        return list(self._errors)

    @property
    def warnings(self) -> List[ValidationError]:
        return list(self._warnings)

    @property
    def cleaned_data(self) -> Dict[str, Any]:
        return dict(self._cleaned_data)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "valid": self.is_valid,
            "errors": [e.to_dict() for e in self._errors],
            "warnings": [w.to_dict() for w in self._warnings],
        }

    def merge(self, other: "ValidationResult") -> None:
        """Merge another result into this one."""
        self._errors.extend(other._errors)
        self._warnings.extend(other._warnings)
        self._cleaned_data.update(other._cleaned_data)


class FieldValidator:
    """Validates a single field value against a set of rules."""

    def __init__(
        self,
        field_type: Type = str,
        required: bool = True,
        allow_none: bool = False,
        min_length: Optional[int] = None,
        max_length: Optional[int] = None,
        min_value: Optional[Union[int, float]] = None,
        max_value: Optional[Union[int, float]] = None,
        pattern: Optional[str] = None,
        choices: Optional[List[Any]] = None,
        custom_validators: Optional[List[Callable[[Any], Optional[str]]]] = None,
        coerce: bool = True,
        default: Any = None,
        nested: Optional["SchemaValidator"] = None,
    ) -> None:
        self.field_type = field_type
        self.required = required
        self.allow_none = allow_none
        self.min_length = min_length
        self.max_length = max_length
        self.min_value = min_value
        self.max_value = max_value
        self.pattern = re.compile(pattern) if pattern else None
        self.choices = choices
        self.custom_validators = custom_validators or []
        self.coerce = coerce
        self.default = default
        self.nested = nested

    def validate(
        self,
        value: Any,
        field_name: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Any, List[str]]:
        """
        Validate and potentially coerce a value.

        Returns (coerced_value, list_of_error_messages).
        """
        errors: List[str] = []

        # Handle None/missing
        if value is None:
            if self.required:
                errors.append(f"Field '{field_name}' is required")
                return None, errors
            if self.allow_none:
                return None, errors
            return self.default, errors

        # Type coercion
        if self.coerce and not isinstance(value, self.field_type):
            try:
                value = self.field_type(value)
            except (ValueError, TypeError) as e:
                errors.append(
                    f"Field '{field_name}' expected {self.field_type.__name__}, "
                    f"got {type(value).__name__}"
                )
                return value, errors

        # String length validation
        if isinstance(value, str):
            if self.min_length is not None and len(value) < self.min_length:
                errors.append(
                    f"Field '{field_name}' must be at least "
                    f"{self.min_length} characters"
                )
            if self.max_length is not None and len(value) > self.max_length:
                errors.append(
                    f"Field '{field_name}' must be at most "
                    f"{self.max_length} characters"
                )
            if self.pattern and not self.pattern.match(value):
                errors.append(
                    f"Field '{field_name}' does not match required pattern"
                )

        # Numeric range validation
        if isinstance(value, (int, float)):
            if self.min_value is not None and value < self.min_value:
                errors.append(
                    f"Field '{field_name}' must be >= {self.min_value}"
                )
            if self.max_value is not None and value > self.max_value:
                errors.append(
                    f"Field '{field_name}' must be <= {self.max_value}"
                )

        # Choices validation
        if self.choices is not None and value not in self.choices:
            errors.append(
                f"Field '{field_name}' must be one of {self.choices}"
            )

        # Custom validators
        for validator in self.custom_validators:
            error = validator(value)
            if error:
                errors.append(error)

        return value, errors


class SchemaValidator:
    """
    Validates a complete request object against a schema definition.
    """

    def __init__(
        self,
        fields: Optional[Dict[str, FieldValidator]] = None,
        allow_extra: bool = False,
        strict: bool = False,
    ) -> None:
        self._fields = fields or {}
        self._allow_extra = allow_extra
        self._strict = strict
        self._pre_validators: List[Callable[[Dict], Optional[str]]] = []
        self._post_validators: List[Callable[[Dict], Optional[str]]] = []

    def add_field(self, name: str, validator: FieldValidator) -> None:
        """Add a field validator."""
        self._fields[name] = validator

    def pre_validate(self, hook: Callable[[Dict], Optional[str]]) -> None:
        """Add a pre-validation hook that runs before field validation."""
        self._pre_validators.append(hook)

    def post_validate(self, hook: Callable[[Dict], Optional[str]]) -> None:
        """Add a post-validation hook that runs after field validation."""
        self._post_validators.append(hook)

    def validate(
        self,
        data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
        path_prefix: str = "",
    ) -> ValidationResult:
        """
        Validate a data dictionary against the schema.
        """
        result = ValidationResult()
        ctx = context or {}

        # Run pre-validators
        for hook in self._pre_validators:
            error = hook(data)
            if error:
                result.add_error("__all__", error, "pre_validation")

        # Check for extra fields
        if not self._allow_extra:
            extra = set(data.keys()) - set(self._fields.keys())
            if extra and self._strict:
                for field_name in extra:
                    full_path = f"{path_prefix}.{field_name}" if path_prefix else field_name
                    result.add_error(
                        full_path,
                        f"Unknown field '{field_name}'",
                        "unknown_field",
                    )

        # Validate each field
        for field_name, validator in self._fields.items():
            value = data.get(field_name)
            full_path = f"{path_prefix}.{field_name}" if path_prefix else field_name

            # Handle nested validation
            if validator.nested and isinstance(value, dict):
                nested_result = validator.nested.validate(
                    value, ctx, ""
                )
                result.merge(nested_result)
                if nested_result.is_valid:
                    result.set_value(field_name, nested_result.cleaned_data)
                continue

            if validator.nested and isinstance(value, list):
                items = []
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        nested_result = validator.nested.validate(
                            item, ctx, ""
                        )
                        result.merge(nested_result)
                        if nested_result.is_valid:
                            items.append(nested_result.cleaned_data)
                    else:
                        items.append(item)
                result.set_value(field_name, items)
                continue

            coerced, errors = validator.validate(value, full_path, ctx)
            for error in errors:
                result.add_error(full_path, error)
            if not errors:
                result.set_value(field_name, coerced)

        # Run post-validators
        if result.is_valid:
            for hook in self._post_validators:
                error = hook(result.cleaned_data)
                if error:
                    result.add_error("__all__", error, "post_validation")

        return result


def validate_email(value: str) -> Optional[str]:
    """Validate an email address format."""
    pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    if not pattern.match(value):
        return "Invalid email format"
    return None


def validate_url(value: str) -> Optional[str]:
    """Validate a URL format."""
    pattern = re.compile(
        r"^https?://[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?"
        r"(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*"
        r"(:\d+)?(/.*)?$"
    )
    if not pattern.match(value):
        return "Invalid URL format"
    return None


def validate_phone(value: str) -> Optional[str]:
    """Validate a phone number format."""
    cleaned = re.sub(r"[\s\-\(\)]", "", value)
    if not re.match(r"^\+?\d{7,15}$", cleaned):
        return "Invalid phone number format"
    return None
