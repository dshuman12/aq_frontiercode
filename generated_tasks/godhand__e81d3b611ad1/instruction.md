# Task description

Auth cookies are currently scoped to a single host, which breaks production deployments where the API and frontend live on different subdomains of a shared parent domain (for example `api.example.com` and `app.example.com`). In those setups the session cookie set by the backend is not sent back on requests from the frontend origin, so authenticated flows silently fail in production while continuing to work locally on `localhost`.

Update the backend configuration in `server/config.py` to support an explicit shared cookie domain so deployments can opt into a parent-domain scope (for example `.example.com`). When unset—as in local development—cookie behavior must remain exactly as it is today, with no domain attribute forced onto cookies. The setting should be read from the environment and validated consistently with the existing configuration style, and it must flow through to wherever auth cookies are issued.

Keep this change backend-only: do not modify frontend code, Docker compose files, or unrelated routers. Preserve existing cookie security attributes (such as `Secure`, `HttpOnly`, and `SameSite`) and the current local development experience.

# Test guidelines

Run `make test-backend-auth` to exercise the auth flow suite in `server/tests/test_auth_user_flow.py`.

Add or extend tests so they cover both the unset case (no cookie domain applied) and the configured case (cookies scoped to the shared parent domain), and confirm login and CSRF/token behavior still pass. Tests use the `testing` environment and mocked Mongo from `server/tests/conftest.py`.

# Lint guidelines

Match the existing typing and validation conventions used in `server/config.py` (Pydantic settings) so configuration parsing stays consistent. Do not introduce new dependencies.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
