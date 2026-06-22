# Task description

The frontend auth client needs to read CSRF tokens that are set as HttpOnly cookies by the backend. In some deployment topologies (API on a subdomain, frontend on a separate origin), `document.cookie` is not accessible to JavaScript, so there is no way for the frontend to retrieve the tokens it needs to send in request headers.

Add a backend endpoint to `server/api/routers/auth.py` that lets the frontend fetch the current CSRF token values over HTTP. The endpoint should be a safe, read-only operation that returns whatever CSRF tokens are currently present in the request's cookies. Clients that have no active session should receive empty strings rather than errors.

Look at how existing endpoints in `auth.py` handle the `Request` object and cookies, and how the CSRF token cookie names are established across the codebase, to determine the right implementation.

Do not modify any frontend files.

# Test guidelines

Run `make test-backend` to verify the backend suite passes.

Add a test in `server/tests/test_auth_user_flow.py` that exercises the new endpoint with a logged-in session and verifies the response reflects the cookies the client holds. Also verify behavior when no session is active. Use the existing helper functions already defined in `conftest.py`.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Match the route structure, decorator style, and response conventions already present in `server/api/routers/auth.py`.
