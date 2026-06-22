# Task description

Add a read-only endpoint at `GET /api/v1/auth/csrf` to `server/api/routers/auth.py` that returns the CSRF tokens currently stored in the request's cookies as a JSON object. Use an empty string for any cookie that is absent. Read the existing auth code to identify the correct cookie names.

Do not modify any frontend files or the auth logic for any other endpoint.

# Test guidelines

Run `make test-backend` to verify the full backend suite passes.

Add tests in `server/tests/test_auth_user_flow.py` covering the new endpoint.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Match the style of the other route handlers in `server/api/routers/auth.py`.
