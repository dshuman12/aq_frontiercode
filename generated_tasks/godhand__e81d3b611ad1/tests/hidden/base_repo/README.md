# Godhand

## Backend Quick Start

From the repository root:

```bash
chmod +x quick_setup.sh
./quick_setup.sh
```

## Run Again (After Initial Setup)

For subsequent runs, start the backend with:

```bash
cd server
docker-compose up
```

Rebuild only when dependencies change (for example, after editing `server/requirements.txt`):

```bash
cd server
docker-compose up --build
```

## Auth Setup

Set these in `server/.env`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BACKEND_PUBLIC_BASE_URL=http://localhost:5050
FRONTEND_PUBLIC_BASE_URL=http://localhost:5173
GOOGLE_OAUTH_REDIRECT_PATH=/api/v1/auth/google/callback
FRONTEND_OAUTH_SUCCESS_PATH=/lobby
FRONTEND_OAUTH_FAILURE_PATH=/?auth_error=oauth
```

## Google OAuth Setup

Add this callback URL in your Google Cloud OAuth client:

`http://localhost:5050/api/v1/auth/google/callback`

## Notes

- Backend dev port is standardized to `localhost:5050`.
- Auth always supports both Google OAuth and username/email + password.
- Legacy email-verification modules are kept in the repo but are not part of the active auth flow.
- Lightweight production ops runbook: `server/docs/production_runbook.md`.
