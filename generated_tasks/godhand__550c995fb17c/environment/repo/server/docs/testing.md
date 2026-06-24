# Backend Test Guide

This project runs backend tests with `pytest`.

## What The Tests Cover

- `server/tests/test_auth_user_flow.py`
  - Registration and login behavior
  - Auth endpoint rate-limit behavior (`429` responses)
  - CSRF and token validation checks
  - Username-based registration/login coverage
- `server/tests/test_auth_google_oauth.py`
  - Google OAuth login flow
  - Google account link/unlink flow
  - OAuth redirect, callback, and account-collision behavior
- `server/tests/test_messaging_api.py`
  - REST chat endpoints for lobby messaging
- `server/tests/test_messaging_ws.py`
  - WebSocket connection and message flow behavior
- `server/tests/test_messaging_domain.py`
  - Core chat domain/service logic

## Prerequisites

- Docker running locally
- Backend container available via `docker compose` in `server/`

## Simplest Commands

From repository root:

```bash
make test-backend
```

For auth-only:

```bash
make test-backend-auth
```

For Docker-backed execution:

```bash
make test-backend-docker
```

Auth-only in Docker:

```bash
make test-backend-auth-docker
```

## Start Backend (Docker)

From repository root:

```bash
cd server
docker compose up --build
```

Keep this running in one terminal.

## Run Tests In The Running Container

Open a second terminal from repository root and run:

```bash
./server/scripts/test_docker.sh
```

### Run Only Auth Flow Tests

```bash
./server/scripts/test_docker.sh server/tests/test_auth_user_flow.py server/tests/test_auth_google_oauth.py
```

### Run A Single Test

```bash
./server/scripts/test_docker.sh server/tests/test_auth_user_flow.py -k "login_with_username_identifier_succeeds"
```

## One-Off Test Run Without `up`

If you do not want to keep `up` running:

```bash
docker compose -f server/docker-compose.yml -f server/docker-compose.override.yml run --rm api python -m pytest server/tests -q
```

## Local (Non-Docker) Fallback

Use the existing backend venv:

```bash
./server/scripts/test.sh
```

Auth-only local run:

```bash
./server/scripts/test.sh server/tests/test_auth_user_flow.py server/tests/test_auth_google_oauth.py
```

## CI/CD Integration

For pipelines, use one command:

```bash
./server/scripts/test.sh
```

Example GitHub Actions step:

```yaml
- name: Run backend tests
  run: ./server/scripts/test.sh
```

## Notes

- Tests use the `testing` environment and mocked Mongo setup from `server/tests/conftest.py`.
- The scripts above keep local/dev/CI test invocation consistent.
- Email verification modules remain in the codebase for future use, but they are not active in the current auth flow.
