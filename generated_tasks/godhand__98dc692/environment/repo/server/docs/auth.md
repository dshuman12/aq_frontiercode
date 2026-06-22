# Backend Auth API Reference

This document describes all backend authentication endpoints exposed by the server and what the frontend should send/expect. 

## Public User Object Returned to Frontend

Wherever `user` is returned, backend excludes sensitive fields and returns:
```json
{
  "_id": "<mongo object id string>",
  "username": "derivedusername",
  "email": "user@example.com",
  "first_name": "First",
  "last_name": "Last",
  "is_verified": false,
  "created_at": "2026-02-20T...Z",
  "updated_at": "2026-02-20T...Z"
}
```
Not returned: `password`, verification token fields, verification expiry fields.

---

## Endpoint Details

## 1) `GET /api/v1/auth/csrf-token`

Issue anonymous CSRF token for unauthenticated flows.

### Request

- No body
- No auth required
- No CSRF required

### Success

- Status: `200`
- Body:
```json
{
  "csrf_token": "<random token>"
}
```

- Sets cookie: `anon_csrf` (not HttpOnly)

---

## 2) `POST /api/v1/auth/register`

Create a new user account (does **not** auto-login). Sends verification email.

### Request

- Header required: `X-CSRF-TOKEN: <anon_csrf token>`
- Body:

```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "password": "plain-text-password"
}
```

### Success

- Status: `201`
- Body:

```json
{
  "message": "User registered successfully. Please verify your email.",
  "user": {
    "_id": "...",
    "username": "jane",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "is_verified": false,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### Failure

- `401` invalid/missing CSRF token
- `409` email/username already exists
- `422` schema validation failure

---

## 3) `POST /api/v1/auth/login`

Authenticate user and create session cookies.

### Request

- Header required: `X-CSRF-TOKEN: <anon_csrf token>`
- Body:

```json
{
  "email": "jane@example.com",
  "password": "plain-text-password"
}
```

### Success

- Status: `200`
- Body:

```json
{
  "user": {
    "_id": "...",
    "username": "jane",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "is_verified": true,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### Behavior (On Success)
- Sets cookies:
  - `access_token_cookie` (HttpOnly)
  - `refresh_token_cookie` (HttpOnly)
  - `csrf_access_token` (JS-readable)
  - `csrf_refresh_token` (JS-readable)
- Clears cookie: `anon_csrf`

### Failure

- `401` invalid credentials
- `403` unverified email
- `401` invalid/missing CSRF token
- `422` schema validation failure

---

## 4) `GET /api/v1/auth/verify-email?token=...`

Consumes verification token and redirects user to frontend URL.

### Request

- Query param required: `token`
- No auth/CSRF required

### Behavior (On Success)

- Always returns redirect (`307`)
- Redirect target depends on token validity:
  - Success redirect URL: server config `FRONTEND_VERIFY_SUCCESS_URL`
  - Failure redirect URL: server config `FRONTEND_VERIFY_FAILURE_URL`

No JSON response body is expected by frontend for this endpoint.
---

## 5) `POST /api/v1/auth/resend-verification`

Resend verification email, with anti-enumeration behavior.

### Request

- Header required: `X-CSRF-TOKEN: <anon_csrf token>`
- Body:

```json
{
  "email": "jane@example.com"
}
```

### Success

- Status: `200`
- Body is always generic (even if email does not exist or already verified):

```json
{
  "message": "If an account exists, a verification email has been sent."
}
```

### Failure

- `401` invalid/missing CSRF token
- `422` schema validation failure

---

## 6) `GET /api/v1/auth/me`

Return currently authenticated user.

### Request
- Required cookies:
  - `access_token_cookie`
  - `csrf_access_token`
- Required header:
  - `X-CSRF-TOKEN: <value of csrf_access_token cookie>`

### Success
- Status: `200`
- Body:

```json
{
  "user": {
    "_id": "...",
    "username": "...",
    "email": "...",
    "first_name": "...",
    "last_name": "...",
    "is_verified": true,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### Failure
- `401` invalid/expired/missing token or CSRF mismatch (`detail`: `Invalid or expired token`)
- `404` user id in token not found (`detail`: `No user found with this email`)

---

## 7) `POST /api/v1/auth/refresh`

Issue new access token (refresh token remains as-is).

### Request
- Required cookies:
  - `refresh_token_cookie`
  - `csrf_refresh_token`
- Required header:
  - `X-CSRF-TOKEN: <value of csrf_refresh_token cookie>`

### Success
- Status: `200`
- Body:

```json
{
  "message": "Access token refreshed"
}
```

### Behavior (No Success)
- Sets/refreshed cookies:
  - `access_token_cookie` (new)
  - `csrf_access_token` (new)

### Failure
- `401` invalid/expired refresh token or CSRF mismatch (`detail`: `Invalid or expired token`)

---

## 8) `POST /api/v1/auth/logout`

Clear current auth session cookies.

### Request
- Must be currently authenticated with access token
- Required header:
  - `X-CSRF-TOKEN: <value of csrf_access_token cookie>`

### Success
- Status: `200`
- Body:

```json
{
  "message": "Logged out"
}
```

### Behavior (No Success)
- Clears cookies:
  - `access_token_cookie`
  - `refresh_token_cookie`
  - `csrf_access_token`
  - `csrf_refresh_token`
  - `anon_csrf` (also cleared if present)

### Failure
- `401` invalid/expired access token or CSRF mismatch

---