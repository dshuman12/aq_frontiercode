# Task description

Cognito client defaults in this Next.js app are currently selected based on `NODE_ENV`, which is unreliable: production builds pointed at a development API, or local runs pointed at production, end up with mismatched user pool and client IDs. Switch the environment selection to derive from `NEXT_PUBLIC_API_BASE_URL` instead.

Update `app/lib/cognito-env-defaults.ts` so the chosen default set (region, user pool ID, client ID, and any related Cognito values) is determined by inspecting `NEXT_PUBLIC_API_BASE_URL`. When the base URL points at a production host, return production defaults; when it points at a development/local host, return development defaults. Provide a sensible fallback when the variable is unset or unrecognized so existing callers never receive `undefined` where a value was previously returned.

Keep the exported names and return shape consumed by `app/constants/constants.ts` unchanged so downstream imports continue to work. Any explicitly set Cognito environment variables must still take precedence over these computed defaults. Do not alter unrelated constants, auth route handlers, or amplify configuration.

# Test guidelines

Run `npm test` and confirm the suite passes. Add or update tests in `app/lib/__tests__` covering the selection logic: production-style, development-style, localhost, unset, and unrecognized `NEXT_PUBLIC_API_BASE_URL` values, asserting the resolved defaults for each. Cover that explicit env overrides win over computed defaults, and that `NODE_ENV` no longer influences the result.

# Lint guidelines

Run `npm run lint` and resolve any reported issues before finishing. Keep TypeScript types accurate so `next build` type-checking remains clean.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
