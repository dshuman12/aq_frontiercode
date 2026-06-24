# Task description

The video player currently points `<source>`/HLS URLs straight at the backend media origin. Because those requests are issued by the media element rather than our fetch wrapper, the auth cookie is not attached when the API and web app run on different ports, so authenticated streams fail to load.

Route all player media through the same-origin `/stream` proxy so the session cookie ships with every media request. The URL helper in `frontend/src/lib/api-client.ts` should produce `/stream`-prefixed paths for media (playlists, segments, subtitle sidecars) instead of absolute backend origins, while non-media API calls keep their existing behavior. Preserve any query string and path encoding already applied, and keep the exported function names and signatures stable so existing callers in the player feature continue to compile unchanged.

Success means an authenticated user can play a transcoded episode end to end: the master playlist, variant segments, and subtitle tracks all resolve via `/stream` and load with credentials. Direct, unauthenticated origin requests are no longer emitted from the player.

# Test guidelines

Run `npm test` from the repo root. Add or extend unit tests under `frontend/src/lib` (alongside `api-client.test.ts`) covering that media paths are rewritten to `/stream`, that query strings and encoded segments survive the rewrite, and that ordinary API endpoints are untouched. Cover edge cases like already-absolute URLs and empty or root-relative inputs.

# Lint guidelines

Run `bun run -r lint` (or `npm run lint`) and resolve any reported issues. The ESLint config in `eslint.config.mjs` governs the frontend; do not weaken existing rules to silence warnings.

# Style guidelines

Prettier is the source of truth — run `bun run format` before finishing so formatting matches CI. Keep the change scoped to the frontend `lib` layer and player wiring; do not touch backend routes, the auth client, or generated Drizzle artifacts.
