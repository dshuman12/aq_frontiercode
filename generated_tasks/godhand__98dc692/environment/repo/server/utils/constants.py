"""
Application constants and enums.

This module contains all the constants used throughout the application
to maintain consistency and avoid magic strings/numbers.
"""

from enum import Enum

class ResponseMessages:
    """Standard response messages for API endpoints."""
    
    # Success messages
    USER_REGISTERED_SUCCESS = "User registered successfully"
    VERIFY_EMAIL_REQUIRED = "User registered successfully. Please verify your email."
    LOGIN_SUCCESS = "Login successful"
    LOGOUT_SUCCESS = "Logout successful"
    PASSWORD_RESET_EMAIL_SENT = "Check your email for the reset password link"
    PASSWORD_RESET_SUCCESS = "Password has been reset successfully"
    REPORT_SUBMITTED_SUCCESS = "Report submitted successfully."
    REPORT_SAVED_SUCCESS = "Draft saved successfully."
    REPORT_DISCARDED_SUCCESS = "Draft discarded successfully."
    REPORT_NOT_FOUND = "Report not found."
    REPORT_GENERATED_SUCCESS = "Latest report generated successfully."
    REPORT_CORRECTED_SUCCESS = "Corrections applied successfully."
    REPORT_PREVIEW_SUCCESS = "Report preview generated successfully."
    
    # Error messages
    MISSING_CREDENTIALS = "Missing identifier or password"
    INVALID_CREDENTIALS = "Invalid identifier or password"
    USER_ALREADY_EXISTS = "User with this username or email already exists"
    USER_NOT_FOUND = "No user found with this email"
    REGISTRATION_FAILED = "Failed to register user"
    INVALID_IMAGE_FORMAT = "Invalid image format"
    EMAIL_REQUIRED = "Email is required"
    INVALID_TOKEN = "Invalid or expired token"
    INVALID_OR_EXPIRED_TOKEN = "Invalid or expired token"
    AUTH_SESSION_EXPIRED = "Authentication session expired or invalid"
    AUTH_STATE_INVALID = "Invalid authentication state"
    ACCESS_TOKEN_FAILED = "Failed to retrieve access token"
    EMAIL_RETRIEVAL_FAILED = "Failed to retrieve email from Google"
    AUTH_FAILED = "Authentication failed"
    EMAIL_SENDER_NOT_CONFIGURED = "Email sender is not configured"
    UNEXPECTED_ERROR = "An unexpected error occurred"
    CSRF_TOKEN_INVALID = "Invalid or missing CSRF token"
    EMAIL_NOT_VERIFIED = "Email not verified"
    VERIFICATION_EMAIL_GENERIC_SENT = "If an account exists, a verification email has been sent."


class HttpStatus:
    """HTTP status codes used in the application."""
    OK = 200
    CREATED = 201
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    METHOD_NOT_ALLOWED = 405
    CONFLICT = 409
    UNPROCESSABLE_ENTITY = 422
    INTERNAL_SERVER_ERROR = 500


class TokenExpiry:
    """Token expiry configurations."""
    CSRF_TOKEN_HOURS = 4
    ACCESS_TOKEN_HOURS = 72
    REFRESH_TOKEN_HOURS = 168  # 7 days
    VERIFICATION_EMAIL_COOLDOWN_SECONDS = 60


class ValidationConstraints:
    """Validation constraints for user inputs."""
    
    USERNAME_MIN_LENGTH = 3
    USERNAME_MAX_LENGTH = 20
    PASSWORD_MIN_LENGTH = 6
    MIN_AGE = 18

class LogMessages:
    """Standard log messages."""
    
    USER_REGISTRATION_START = "Starting user registration process"
    USER_REGISTRATION_SUCCESS = "User registration successful"
    USER_REGISTRATION_FAILED = "Failed to save user"
    EXISTING_USER_CHECK = "Checking for existing users"
    USER_EXISTS = "User already exists"
    USER_LOGOUT = "User {user_id} logged out successfully"
    VALIDATION_ERROR = "Validation error: {error}"
    LOGIN_ERROR = "Login error: {error}"
    REGISTRATION_ERROR = "Exception during registration: {error}"
