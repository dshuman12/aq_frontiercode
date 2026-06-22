# Auth API (Current)

This document describes the active authentication architecture.

## Active Flows

- Password auth (username/email + password)
- Google OAuth login
- Google account linking/unlinking from an authenticated profile

Email verification code remains in the repository for future re-enable, but it is not part of the active flow.

## Base Path

`/api/v1/auth`

## Endpoints

### 1) `GET /csrf-token`
Returns an anonymous CSRF token and sets `anon_csrf` cookie.

### 2) `POST /register`
Creates a user account (does not auto-login).

Request body:

```json
{
  "username": "pilotname",
  "email": "player@example.com",
  "password": "StrongPass123"
}
```

Response:

```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "...",
    "username": "pilotname",
    "email": "player@example.com",
    "google_email": null,
    "google_linked": false,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### 3) `POST /login`
Logs in with `identifier` (username or email) + password.
Sets access/refresh JWT cookies and CSRF cookies.

### 4) `GET /google/login`
Starts Google OAuth login redirect flow.

### 5) `GET /google/callback`
Handles OAuth callback, creates or links account, issues JWT cookies, redirects to frontend.

### 6) `POST /google/link/start`
Authenticated endpoint to begin linking a Google account to the current user.

### 7) `POST /google/unlink`
Authenticated endpoint to unlink the currently linked Google account.

### 8) `GET /me`
Returns current authenticated user profile.

### 9) `PATCH /me/username`
Updates the in-game username for the authenticated user.

### 10) `POST /refresh`
Refreshes access token using refresh token cookie + refresh CSRF token.

### 11) `POST /logout`
Clears auth and CSRF cookies.

## Environment Variables (Auth)

Required:
- `SECRET_KEY`
- `JWT_SECRET_KEY`

Google OAuth:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BACKEND_PUBLIC_BASE_URL`
- `FRONTEND_PUBLIC_BASE_URL`
- `GOOGLE_OAUTH_REDIRECT_PATH`
- `FRONTEND_OAUTH_SUCCESS_PATH`
- `FRONTEND_OAUTH_FAILURE_PATH`
- `FRONTEND_OAUTH_LINK_SUCCESS_PATH`
- `FRONTEND_OAUTH_LINK_FAILURE_PATH`

Optional:
- Auth rate-limit vars for login/register
- Legacy email verification vars (inactive unless re-enabled in code)
