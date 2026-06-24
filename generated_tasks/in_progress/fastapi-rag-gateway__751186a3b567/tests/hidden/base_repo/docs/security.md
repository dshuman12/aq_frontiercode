# Security

This document describes the security posture of the FastAPI RAG
Gateway and the controls implemented in `app.core.security`,
`app.core.middleware`, and the API layer.

## Authentication

* Passwords are hashed with `passlib`'s default `bcrypt` configuration.
* API keys are random URL-safe tokens, prefixed with the configured
  `API_KEY_PREFIX` and stored as SHA-256 digests; the plaintext is only
  returned once at creation time.
* JWT tokens are signed with HMAC-SHA256 using `SECRET_KEY`. Both
  access and refresh tokens carry a `type` claim that is validated by
  `decode_token`.

## Authorisation

* Role-based access control is enforced at the route layer through the
  `current_user` and `current_admin` dependencies in
  `app/api/deps.py`.
* The model `User` exposes `is_admin`, which evaluates `is_superuser`
  or membership in the `admin` role.
* `require_scopes()` provides a helper to enforce additional
  fine-grained scopes (e.g., `documents:read`).

## Transport

* CORS is fully configurable via `CORS_*` settings.
* The `SecurityHeadersMiddleware` adds HSTS, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, and a relaxed
  `Permissions-Policy` to every response.
* `MaxRequestSizeMiddleware` rejects requests larger than
  `MAX_UPLOAD_BYTES`.

## Rate limiting

The `RateLimitMiddleware` implements a token-bucket per IP and per
authenticated user. Buckets live in the configured cache backend, so
multiple replicas share the same view of usage when Redis is
configured. Rate limit headers (`X-RateLimit-Limit`,
`X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`) are
emitted on every response.

## Auditing

The `AuditLog` model captures who performed which action against which
resource. The `AuditLogRepository` exposes a `record(...)` helper that
services can call to persist a row in the same transaction as the
mutation it audits.
