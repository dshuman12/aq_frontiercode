"""Custom exception hierarchy for the RAG Gateway.

The exceptions defined here form a small, well-typed hierarchy that
maps cleanly onto HTTP status codes via the FastAPI exception handlers
in :mod:`app.core.middleware`. Each exception carries:

* a stable ``code`` string used in API responses and logs,
* an HTTP ``status_code`` for direct mapping,
* an optional ``details`` payload for structured client-facing data.

Application code should raise these (or subclasses) instead of
:class:`fastapi.HTTPException` so that we can serialise consistent
error envelopes and log structured telemetry in one place.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ErrorDetails:
    """Structured details attached to errors."""

    fields: dict[str, str] = field(default_factory=dict)
    hint: str | None = None
    docs_url: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {}
        if self.fields:
            payload["fields"] = dict(self.fields)
        if self.hint:
            payload["hint"] = self.hint
        if self.docs_url:
            payload["docs_url"] = self.docs_url
        if self.extra:
            payload["extra"] = dict(self.extra)
        return payload


class AppError(Exception):
    """Base class for all expected application errors."""

    code: str = "app_error"
    status_code: int = 500
    message: str = "Internal server error"

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        status_code: int | None = None,
        details: ErrorDetails | Mapping[str, Any] | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message or self.message)
        if message is not None:
            self.message = message
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code
        self.details = self._coerce_details(details)
        self.__cause__ = cause

    # ------------------------------------------------------------------

    @staticmethod
    def _coerce_details(
        details: ErrorDetails | Mapping[str, Any] | None,
    ) -> ErrorDetails:
        if details is None:
            return ErrorDetails()
        if isinstance(details, ErrorDetails):
            return details
        if isinstance(details, Mapping):
            return ErrorDetails(
                fields=dict(details.get("fields", {})),
                hint=details.get("hint"),
                docs_url=details.get("docs_url"),
                extra={k: v for k, v in details.items() if k not in {"fields", "hint", "docs_url"}},
            )
        raise TypeError(f"Unsupported details type: {type(details)!r}")

    # ------------------------------------------------------------------

    def to_dict(self) -> dict[str, Any]:
        """Serialise into the standard API error envelope."""

        envelope: dict[str, Any] = {
            "code": self.code,
            "message": self.message,
            "status": self.status_code,
        }
        details = self.details.to_dict()
        if details:
            envelope["details"] = details
        return envelope

    def __repr__(self) -> str:  # pragma: no cover - cosmetic
        return f"{type(self).__name__}(code={self.code!r}, status={self.status_code})"


class ValidationError(AppError):
    code = "validation_error"
    status_code = 422
    message = "The request payload failed validation."


class AuthenticationError(AppError):
    code = "authentication_error"
    status_code = 401
    message = "Authentication credentials were not provided or are invalid."


class AuthorizationError(AppError):
    code = "authorization_error"
    status_code = 403
    message = "You do not have permission to perform this action."


class NotFoundError(AppError):
    code = "not_found"
    status_code = 404
    message = "The requested resource was not found."


class ConflictError(AppError):
    code = "conflict"
    status_code = 409
    message = "The request conflicts with the current state."


class GoneError(AppError):
    code = "gone"
    status_code = 410
    message = "The resource is no longer available."


class PreconditionFailedError(AppError):
    code = "precondition_failed"
    status_code = 412
    message = "A precondition in the request failed."


class PayloadTooLargeError(AppError):
    code = "payload_too_large"
    status_code = 413
    message = "The request payload is larger than the configured maximum."


class UnsupportedMediaTypeError(AppError):
    code = "unsupported_media_type"
    status_code = 415
    message = "The request media type is not supported."


class RateLimitError(AppError):
    code = "rate_limited"
    status_code = 429
    message = "You are sending requests too quickly."

    def __init__(
        self,
        message: str | None = None,
        *,
        retry_after_seconds: float | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(message, **kwargs)
        self.retry_after_seconds = retry_after_seconds


class ExternalServiceError(AppError):
    code = "external_service_error"
    status_code = 502
    message = "An upstream service returned an error."


class ServiceUnavailableError(AppError):
    code = "service_unavailable"
    status_code = 503
    message = "The service is temporarily unavailable."


class ConfigurationError(AppError):
    code = "configuration_error"
    status_code = 500
    message = "The service is misconfigured."


class IndexingError(AppError):
    code = "indexing_error"
    status_code = 500
    message = "Failed to index document(s)."


class RetrievalError(AppError):
    code = "retrieval_error"
    status_code = 500
    message = "Failed to retrieve relevant context."


class GenerationError(AppError):
    code = "generation_error"
    status_code = 500
    message = "The language model failed to produce a response."


class ProviderError(AppError):
    code = "provider_error"
    status_code = 502
    message = "A pluggable provider returned an error."


__all__ = [
    "ErrorDetails",
    "AppError",
    "ValidationError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "ConflictError",
    "GoneError",
    "PreconditionFailedError",
    "PayloadTooLargeError",
    "UnsupportedMediaTypeError",
    "RateLimitError",
    "ExternalServiceError",
    "ServiceUnavailableError",
    "ConfigurationError",
    "IndexingError",
    "RetrievalError",
    "GenerationError",
    "ProviderError",
]
