"""Tests for nexusflow.api.validation."""

import pytest

from nexusflow.api.validation import (
    FieldValidator,
    SchemaValidator,
    ValidationError,
    ValidationErrorLevel,
    ValidationResult,
)


class TestFieldValidator:
    """Tests for individual field validation."""

    def test_required_field_missing(self):
        v = FieldValidator(field_type=str, required=True)
        val, errors = v.validate(None, "name")
        assert len(errors) > 0
        assert "required" in errors[0].lower()

    def test_optional_field_missing(self):
        v = FieldValidator(field_type=str, required=False, default="anon")
        val, errors = v.validate(None, "name")
        assert errors == []
        assert val == "anon"

    def test_type_coercion_str_to_int(self):
        v = FieldValidator(field_type=int, coerce=True)
        val, errors = v.validate("42", "age")
        assert errors == []
        assert val == 42

    def test_type_coercion_failure(self):
        v = FieldValidator(field_type=int, coerce=True)
        val, errors = v.validate("not_a_number", "age")
        assert len(errors) > 0

    def test_min_length_validation(self):
        v = FieldValidator(field_type=str, min_length=3)
        val, errors = v.validate("ab", "name")
        assert len(errors) > 0

    def test_max_length_validation(self):
        v = FieldValidator(field_type=str, max_length=5)
        val, errors = v.validate("toolong", "name")
        assert len(errors) > 0

    def test_min_value_validation(self):
        v = FieldValidator(field_type=int, min_value=0)
        val, errors = v.validate(-1, "count")
        assert len(errors) > 0

    def test_max_value_validation(self):
        v = FieldValidator(field_type=int, max_value=100)
        val, errors = v.validate(200, "score")
        assert len(errors) > 0

    def test_pattern_validation(self):
        v = FieldValidator(field_type=str, pattern=r"^[a-z]+$")
        _, errors = v.validate("ABC123", "username")
        assert len(errors) > 0

    def test_choices_validation(self):
        v = FieldValidator(field_type=str, choices=["red", "green", "blue"])
        _, errors = v.validate("purple", "color")
        assert len(errors) > 0

    def test_custom_validator(self):
        def check_even(val):
            if val % 2 != 0:
                return "Must be even"
            return None

        v = FieldValidator(field_type=int, custom_validators=[check_even])
        _, errors = v.validate(3, "number")
        assert any("even" in e.lower() for e in errors)

    def test_valid_value_passes(self):
        v = FieldValidator(
            field_type=str, required=True, min_length=1, max_length=50
        )
        val, errors = v.validate("Alice", "name")
        assert errors == []
        assert val == "Alice"


class TestValidationResult:
    """Tests for the ValidationResult collector."""

    def test_initially_valid(self):
        result = ValidationResult()
        assert result.is_valid is True

    def test_invalid_after_error(self):
        result = ValidationResult()
        result.add_error("name", "is required")
        assert result.is_valid is False
        assert len(result.errors) == 1

    def test_warnings_dont_invalidate(self):
        result = ValidationResult()
        result.add_warning("email", "consider using org email")
        assert result.is_valid is True
        assert len(result.warnings) == 1

    def test_cleaned_data(self):
        result = ValidationResult()
        result.set_value("name", "Alice")
        result.set_value("age", 30)
        assert result.cleaned_data == {"name": "Alice", "age": 30}

    def test_merge_results(self):
        r1 = ValidationResult()
        r1.add_error("a", "bad")
        r2 = ValidationResult()
        r2.add_error("b", "also bad")
        r1.merge(r2)
        assert len(r1.errors) == 2

    def test_to_dict(self):
        result = ValidationResult()
        result.add_error("name", "required", code="missing")
        d = result.to_dict()
        assert d["valid"] is False
        assert len(d["errors"]) == 1
        assert d["errors"][0]["code"] == "missing"
