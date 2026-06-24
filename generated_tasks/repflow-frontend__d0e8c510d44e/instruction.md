# Task description

Cognito client defaults are currently selected based on `NODE_ENV`, which is incorrect: a production build pointed at a development API still picks production Cognito values, and local tooling that runs with `NODE_ENV=production` breaks. Switch the environment selection so it derives from `NEXT_PUBLIC_API_BASE_URL` instead.

Update `app/lib/cognito-env-defaults.ts` so the defaults are chosen by inspecting `NEXT_PUBLIC_API_BASE_URL`: when the base URL points at a local or development host, return development Cognito defaults; otherwise return production defaults. Wire any consuming logic in `app/constants/constants.ts` so the exported Cognito constants reflect this new resolution while keeping the same exported names and value shapes.

Explicitly set environment variables (e.g. an existing Cognito override) must continue to take precedence over the derived defaults, and an unset or unrecognized base URL should fall back to safe production defaults. Do not change unrelated constants, auth routes, or the Stripe configuration.

# Test guidelines

Run `npm test`. Add or extend specs under `app/lib/__tests__` covering the resolution logic: a development/localhost `NEXT_PUBLIC_API_BASE_URL` yields development defaults, a production URL yields production defaults, an explicit override wins over the derived value, and a missing or unknown URL falls back to production.

Use Jest with the existing `jest.config.ts` setup. Mutate and restore `process.env` within tests so cases stay isolated and do not leak between specs.

# Lint guidelines

Run `npm run lint` and resolve all reported issues before finishing. Follow the existing ESLint flat config (`eslint.config.mjs`) and `eslint-config-next` rules; do not disable rules inline to silence warnings.

# Style guidelines

Match the existing TypeScript style: prefer named exports, explicit return types on exported helpers, and the current import ordering. Keep the public surface of `app/constants/constants.ts` stable so other modules continue importing the same symbols unchanged.

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from another branch.
