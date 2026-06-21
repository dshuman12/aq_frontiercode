"""
nexusflow.utils.types
~~~~~~~~~~~~~~~~~~~~~

Custom type system utilities including sentinel values, tagged
unions, type coercion, and runtime type checking helpers.
"""

from __future__ import annotations

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


class _SentinelType:
    """A unique sentinel value distinct from None."""

    _instances: Dict[str, "_SentinelType"] = {}

    def __init__(self, name: str) -> None:
        self._name = name

    def __repr__(self) -> str:
        return f"<{self._name}>"

    def __bool__(self) -> bool:
        return False

    def __hash__(self) -> int:
        return hash(self._name)

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, _SentinelType):
            return self._name == other._name
        return NotImplemented

    @classmethod
    def create(cls, name: str) -> "_SentinelType":
        """Create or return a named sentinel."""
        if name not in cls._instances:
            cls._instances[name] = cls(name)
        return cls._instances[name]


# Common sentinels
MISSING = _SentinelType.create("MISSING")
UNSET = _SentinelType.create("UNSET")
DEFAULT = _SentinelType.create("DEFAULT")
EMPTY = _SentinelType.create("EMPTY")


T = TypeVar("T")
U = TypeVar("U")
E = TypeVar("E")


class Result(Generic[T, E]):
    """
    A result type representing either success (Ok) or failure (Err).
    Similar to Rust's Result<T, E>.
    """

    def __init__(
        self,
        value: Optional[T] = None,
        error: Optional[E] = None,
        _is_ok: bool = True,
    ) -> None:
        self._value = value
        self._error = error
        self._is_ok = _is_ok

    @classmethod
    def ok(cls, value: T) -> "Result[T, E]":
        return cls(value=value, _is_ok=True)

    @classmethod
    def err(cls, error: E) -> "Result[T, E]":
        return cls(error=error, _is_ok=False)

    @property
    def is_ok(self) -> bool:
        return self._is_ok

    @property
    def is_err(self) -> bool:
        return not self._is_ok

    def unwrap(self) -> T:
        """Get the value or raise if error."""
        if self._is_ok:
            return self._value  # type: ignore
        raise ValueError(f"Called unwrap on Err: {self._error}")

    def unwrap_or(self, default: T) -> T:
        """Get the value or return default."""
        if self._is_ok:
            return self._value  # type: ignore
        return default

    def unwrap_err(self) -> E:
        """Get the error or raise if ok."""
        if not self._is_ok:
            return self._error  # type: ignore
        raise ValueError("Called unwrap_err on Ok")

    def map(self, func: Callable[[T], U]) -> "Result[U, E]":
        """Map the success value."""
        if self._is_ok:
            return Result.ok(func(self._value))  # type: ignore
        return Result.err(self._error)  # type: ignore

    def map_err(self, func: Callable[[E], U]) -> "Result[T, U]":
        """Map the error value."""
        if not self._is_ok:
            return Result.err(func(self._error))  # type: ignore
        return Result.ok(self._value)  # type: ignore

    def and_then(self, func: Callable[[T], "Result[U, E]"]) -> "Result[U, E]":
        """Chain operations that return Results."""
        if self._is_ok:
            return func(self._value)  # type: ignore
        return Result.err(self._error)  # type: ignore

    def __repr__(self) -> str:
        if self._is_ok:
            return f"Ok({self._value!r})"
        return f"Err({self._error!r})"


class TypeCoercion:
    """Configurable type coercion system."""

    def __init__(self) -> None:
        self._coercions: Dict[Tuple[type, type], Callable] = {}
        self._register_defaults()

    def _register_defaults(self) -> None:
        """Register default type coercions."""
        self.register(str, int, int)
        self.register(str, float, float)
        self.register(str, bool, lambda s: s.lower() in ("true", "1", "yes", "on"))
        self.register(int, str, str)
        self.register(int, float, float)
        self.register(int, bool, bool)
        self.register(float, str, str)
        self.register(float, int, int)
        self.register(bool, str, str)
        self.register(bool, int, int)
        self.register(list, tuple, tuple)
        self.register(tuple, list, list)
        self.register(str, list, lambda s: [c for c in s])
        self.register(list, str, lambda lst: ",".join(str(x) for x in lst))

    def register(
        self,
        from_type: type,
        to_type: type,
        converter: Callable,
    ) -> None:
        """Register a type coercion."""
        self._coercions[(from_type, to_type)] = converter

    def coerce(self, value: Any, target_type: type) -> Any:
        """Coerce a value to the target type."""
        if isinstance(value, target_type):
            return value

        source_type = type(value)
        converter = self._coercions.get((source_type, target_type))
        if converter:
            return converter(value)

        # Try direct construction
        try:
            return target_type(value)
        except (ValueError, TypeError):
            raise TypeError(
                f"Cannot coerce {source_type.__name__} to {target_type.__name__}"
            )

    def can_coerce(self, from_type: type, to_type: type) -> bool:
        """Check if a coercion path exists."""
        if from_type == to_type:
            return True
        return (from_type, to_type) in self._coercions


class TypeValidator:
    """Runtime type validation utilities."""

    @staticmethod
    def is_instance(value: Any, types: Union[type, Tuple[type, ...]]) -> bool:
        """Check if value is an instance of the given type(s)."""
        return isinstance(value, types)

    @staticmethod
    def is_optional(value: Any, inner_type: type) -> bool:
        """Check if value is None or an instance of inner_type."""
        return value is None or isinstance(value, inner_type)

    @staticmethod
    def is_list_of(value: Any, item_type: type) -> bool:
        """Check if value is a list of items of the given type."""
        if not isinstance(value, list):
            return False
        return all(isinstance(item, item_type) for item in value)

    @staticmethod
    def is_dict_of(
        value: Any, key_type: type, value_type: type
    ) -> bool:
        """Check if value is a dict with the given key/value types."""
        if not isinstance(value, dict):
            return False
        return all(
            isinstance(k, key_type) and isinstance(v, value_type)
            for k, v in value.items()
        )

    @staticmethod
    def assert_type(value: Any, expected: type, name: str = "value") -> None:
        """Assert that a value is of the expected type."""
        if not isinstance(value, expected):
            raise TypeError(
                f"Expected {name} to be {expected.__name__}, "
                f"got {type(value).__name__}"
            )
