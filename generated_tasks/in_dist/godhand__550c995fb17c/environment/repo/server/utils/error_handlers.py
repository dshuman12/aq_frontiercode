"""
Custom exception classes and error handlers for the application.

This module provides custom exceptions and centralized error handling
to maintain consistency across the application.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from server.utils.constants import HttpStatus, ResponseMessages
from typing import Tuple, Dict, Any

from server.utils.logging import get_app_logger
app_logger = get_app_logger()

class APIError(Exception):
    """Base class for API-related errors."""
    
    def __init__(self, message: str, status_code: int = HttpStatus.INTERNAL_SERVER_ERROR):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

class DomainValidationError(APIError):
    """Raised when input validation fails."""
    
    def __init__(self, message: str):
        super().__init__(message, HttpStatus.BAD_REQUEST)

class AuthenticationError(APIError):
    """Raised when authentication fails."""
    
    def __init__(self, message: str = ResponseMessages.INVALID_CREDENTIALS):
        super().__init__(message, HttpStatus.UNAUTHORIZED)

class AuthorizationError(APIError):
    """Raised when authorization fails."""
    
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, HttpStatus.FORBIDDEN)

class NotFoundError(APIError):
    """Raised when a resource is not found."""
    
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, HttpStatus.NOT_FOUND)

class ConflictError(APIError):
    """Raised when there's a conflict with existing data."""
    
    def __init__(self, message: str = ResponseMessages.USER_ALREADY_EXISTS):
        super().__init__(message, HttpStatus.CONFLICT)

class ConfigurationError(APIError):
    """Raised when there's a configuration issue."""
    
    def __init__(self, message: str):
        super().__init__(message, HttpStatus.INTERNAL_SERVER_ERROR)

class InternalServerError(APIError):
    """Raised for unexpected internal errors."""

    def __init__(self, message: str = "Internal server error"):
        super().__init__(message, HttpStatus.INTERNAL_SERVER_ERROR)


def register_error_handlers(app):
    """Register error handlers with the FastAPI application."""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "path": request.url.path,
                "method": request.method,
                "url": str(request.url),
            },
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=HttpStatus.UNPROCESSABLE_ENTITY,
            content={"detail": "Validation failed", "errors": exc.errors()},
        )
    
    @app.exception_handler(APIError)
    async def api_exception_handler(request: Request, exc: APIError):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.message,
                "path": request.url.path,
                "method": request.method,
                "url": str(request.url),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        app_logger.error(f"Unhandled exception: {str(exc)}")
        return JSONResponse(
            status_code=HttpStatus.INTERNAL_SERVER_ERROR,
            content={
                "detail": "Internal server error",
                "path": request.url.path,
                "method": request.method,
                "url": str(request.url),
            },
            headers={"X-Error": "true"}, 
        )
