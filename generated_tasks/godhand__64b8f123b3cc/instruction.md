# Task description

The authentication CSRF flow and production asset loading have several instabilities that surface in non-localhost and production-built environments. Harden the backend CSRF handling in `server/api/routers/auth.py` (with supporting logic in `server/api/security/csrf.py` and `server/api/security/cookies.py` as needed) so that token issuance, validation, and rejection behave consistently across register, login, and logout. CSRF failures must return clear, predictable error responses, and the existing success paths for both Google OAuth and username/email + password auth must remain unchanged.

Expose `GET /api/v1/auth/csrf` as a logged-in CSRF snapshot endpoint. It should return the current `csrf_access_token` and `csrf_refresh_token` cookie values, and an empty `anon_csrf` value after login. Preserve the existing error contract for already-authenticated JWT-protected endpoints: malformed, expired, wrong-type, or otherwise rejected authenticated-token flows should continue to return the existing invalid-token response rather than introducing a new response string.

On the frontend, stabilize how production assets and auth transport are resolved. Audit `frontend/src/lib/authApi.ts` for correct base-URL and credential handling, and ensure the game/theme asset modules (`buildingSprites.ts`, `oreSprites.ts`, `terrainTileset.ts`, `valleyDecorations.ts`) and screens (`GameScreen.tsx`, `LobbyScreen.tsx`, `ProfileQuickMenu.tsx`) load assets reliably under a production build, not only in dev.

Keep `server/docs/auth.md` aligned with any behavioral changes. Do not alter the insecure-auth override or HTTPS enforcement semantics described in the README.

# Test guidelines

Run the visible suite with `make test-backend-auth`. Add or extend cases under `server/tests` (primarily `test_auth_user_flow.py`) to cover the CSRF issuance, validation, and rejection paths you touch, and to lock in that existing auth success flows still pass.

# Lint guidelines

For backend changes, keep imports and formatting consistent with the surrounding modules. For frontend changes, run `npm run lint` in `frontend/` and resolve any new findings without disabling rules. Do not fix unrelated pre-existing lint findings outside the task surface just to make lint clean; report them instead.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch. Leave the legacy email-verification modules untouched, and avoid introducing churn in generated build output or unrelated game-engine files.
