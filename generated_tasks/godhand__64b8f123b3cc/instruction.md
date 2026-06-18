# Task description

The auth CSRF flow and production asset loading are unstable and need to be hardened. On the backend, the auth router (`server/api/routers/auth.py`) must enforce CSRF validation consistently across state-changing auth endpoints, returning clear errors when a CSRF token is missing or mismatched, and keeping the existing rate-limit and token-validation behavior intact. On the frontend, `frontend/src/lib/authApi.ts` must send and synchronize CSRF tokens correctly so login, registration, and logout requests succeed without spurious failures, preserving the existing HTTPS transport guard for non-localhost environments.

Production asset loading in the game theme modules (`buildingSprites.ts`, `oreSprites.ts`, `terrainTileset.ts`, `valleyDecorations.ts`) must resolve asset URLs in a way that works under a built/bundled deployment rather than only in dev. Update `ProfileQuickMenu.tsx`, `GameScreen.tsx`, and `LobbyScreen.tsx` only as needed to consume the corrected auth/asset behavior. Keep `server/docs/auth.md` aligned with the resulting CSRF contract.

Do not change the public auth API shape, route paths, or unrelated game simulation logic.

# Test guidelines

Run the visible test command:

```bash
make test-backend-auth
```

This exercises `server/tests/test_auth_user_flow.py`, covering registration, login, rate-limit `429` responses, and CSRF/token validation. Add or extend tests in `server/tests` so the missing-token and mismatched-token CSRF cases are asserted on the state-changing endpoints. Confirm the full backend suite still passes via `make test-backend`. Tests use the `testing` environment and the mocked Mongo setup from `server/tests/conftest.py`.

# Lint guidelines

Lint the frontend with `cd frontend && npm run lint` (ESLint via `frontend/eslint.config.js`) and resolve any reported issues in the files you touch. Keep TypeScript clean under `npm run build` (`tsc -b`).

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch. Match the surrounding TypeScript and Python conventions, and avoid introducing churn in generated or bundled output.
