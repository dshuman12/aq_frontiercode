# Task description

Stabilize the auth CSRF flow and production asset loading so login/register works reliably under production-like conditions.

On the backend, harden the CSRF protection in `server/api/routers/auth.py` so the auth endpoints accept legitimate same-origin requests and consistently reject missing or mismatched CSRF tokens. The double-submit pairing between the CSRF cookie and the request header must validate correctly across register, login, logout, and token refresh, returning the appropriate status codes without leaking sensitive errors. As part of this, **add a new `GET /api/v1/auth/csrf` endpoint** that lets an authenticated client read its current CSRF tokens (see the Response contract). Keep the existing route prefixes, request schemas, and response shapes intact so existing clients and `server/docs/auth.md` stay accurate; update that doc if the observable contract changes.

On the frontend, fix production asset loading so the game theme assets (`buildingSprites.ts`, `oreSprites.ts`, `terrainTileset.ts`, `valleyDecorations.ts`) resolve under the production base URL rather than relying on dev-only paths, and ensure `authApi.ts`, `ProfileQuickMenu.tsx`, `GameScreen.tsx`, and `LobbyScreen.tsx` send CSRF-protected auth/session requests consistently with the backend contract.

Do not change unrelated game simulation, worldgen, or messaging behavior. Preserve the secure-transport rules for non-localhost auth.

## Response contract

Keep these exact observable behaviors for the auth endpoints (the auth-flow tests and existing clients depend on them):

- `POST` register → `201`, body `{"message": ResponseMessages.USER_REGISTERED_SUCCESS, "user": {...}}`. The `user` includes `email` and `username` and must **not** include `password`. Registration must **not** set auth cookies — `access_token_cookie`, `refresh_token_cookie`, and `csrf_access_token` are all absent on a register response.
- `POST` register with an already-used email → `409`.
- `POST` login with a wrong password → `401`.
- `POST` login with a correct password, identified by **either** email or username → `200`, body `{"user": {...}}`, and it **must** set both `access_token_cookie` and `refresh_token_cookie`.
- **`GET /api/v1/auth/csrf`** (new endpoint, authenticated session) → `200`, JSON: `csrf_access_token` equal to the request's `csrf_access_token` cookie, `csrf_refresh_token` equal to the `csrf_refresh_token` cookie, and `anon_csrf` equal to `""` (empty string) for an authenticated caller. This snapshot endpoint lets the frontend read its current CSRF tokens.

# Test guidelines

Run `make test-backend-auth`, which executes `server/tests/test_auth_user_flow.py` and covers registration, login, logout, refresh, rate-limit (`429`) responses, and CSRF/token validation edge cases.

Add or extend tests under `server/tests` to cover both accepted same-origin CSRF requests and rejected missing/mismatched-token requests. Tests use the mocked Mongo setup in `server/tests/conftest.py` under the `testing` environment.

# Lint guidelines

For frontend changes, run `npm run lint` from `frontend/` and resolve all reported issues. Keep TypeScript types intact; do not introduce `any` to silence checks.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
